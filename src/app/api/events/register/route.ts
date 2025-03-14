import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, addToTable, getTableData } from '@/lib/sheets';

// POST /api/events/register - Register for an event
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      companyName: rawCompanyName,
      eventName,
      name,
      whatsappNumber,
      nationalId,
      email,
      education,
      universityCollege,
      age,
      gender,
    } = body;
    
    // Ensure company name is properly decoded
    const companyName = decodeURIComponent(rawCompanyName);
    
    console.log('Registration request received:', {
      companyName,
      eventName,
      name,
      email,
    });
    
    // Validate required fields
    if (!companyName || !eventName || !name || !whatsappNumber || !nationalId || !email || !education || !universityCollege || !age || !gender) {
      console.log('Validation failed - missing fields:', {
        companyName: !!companyName,
        eventName: !!eventName,
        name: !!name,
        whatsappNumber: !!whatsappNumber,
        nationalId: !!nationalId,
        email: !!email,
        education: !!education,
        universityCollege: !!universityCollege,
        age: !!age,
        gender: !!gender,
      });
      
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate phone number (simple validation)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(whatsappNumber)) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp number format' },
        { status: 400 }
      );
    }
    
    // Check if the company exists
    try {
      console.log('Checking if company exists:', companyName);
      let sheetData;
      try {
        sheetData = await getSheetData(companyName);
      } catch (error) {
        console.error(`Error getting sheet data for company ${companyName}:`, error);
        return NextResponse.json(
          { error: `Company "${companyName}" not found or inaccessible` },
          { status: 404 }
        );
      }
      
      if (!sheetData || sheetData.length === 0) {
        console.error(`Company sheet ${companyName} is empty or does not exist`);
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      
      // Check if the company is disabled
      let companiesData;
      try {
        companiesData = await getSheetData('companies');
      } catch (error) {
        console.error('Error getting companies data:', error);
        return NextResponse.json(
          { error: 'Failed to verify company status' },
          { status: 500 }
        );
      }
      
      const companies = companiesData.slice(1); // Skip header row
      
      // Find the company
      const company = companies.find((row) => row[1] === companyName);
      
      if (company) {
        const status = company[5] || 'enabled';
        if (status === 'disabled') {
          console.error(`Company ${companyName} is disabled`);
          return NextResponse.json(
            { error: 'Company is disabled, registration is not available' },
            { status: 403 }
          );
        }
      } else {
        console.error(`Company ${companyName} not found in companies list`);
        return NextResponse.json(
          { error: 'Company not found in the system' },
          { status: 404 }
        );
      }
      
      // Check if the event exists
      try {
        console.log('Checking if event exists:', { companyName, eventName });
        let tableData;
        try {
          tableData = await getTableData(companyName, eventName);
        } catch (error) {
          console.error(`Error getting table data for event ${eventName}:`, error);
          return NextResponse.json(
            { error: `Event "${eventName}" not found or inaccessible` },
            { status: 404 }
          );
        }
        
        if (!tableData || tableData.length === 0) {
          console.error(`Event ${eventName} not found in company ${companyName}`);
          return NextResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          );
        }
        
        // Check if the event is disabled
        const headers = tableData[0];
        const statusIndex = headers.findIndex(h => h === 'EventStatus');
        
        if (statusIndex !== -1 && tableData.length > 1) {
          const eventStatus = tableData[1][statusIndex];
          if (eventStatus === 'disabled') {
            console.error(`Event ${eventName} is disabled`);
            return NextResponse.json(
              { error: 'Event registration is currently disabled' },
              { status: 403 }
            );
          }
        }
        
        // Check if the person is already registered (by email or whatsapp)
        // Skip header row
        const registrationData = tableData.slice(1);
        
        // Find registration with matching email or whatsapp
        const emailIndex = headers.findIndex(h => h === 'Email');
        const whatsappIndex = headers.findIndex(h => h === 'WhatsApp Number');
        
        const existingRegistration = registrationData.find(
          (row) => (emailIndex !== -1 && row[emailIndex] === email) || 
                  (whatsappIndex !== -1 && row[whatsappIndex] === whatsappNumber)
        );
        
        if (existingRegistration) {
          console.error('User already registered:', { email, whatsappNumber });
          return NextResponse.json(
            { error: 'You are already registered for this event' },
            { status: 400 }
          );
        }
        
        // Add registration to the event table
        const registrationDate = new Date().toISOString();
        
        console.log('Adding registration to table:', {
          companyName,
          eventName,
          name,
          email,
        });
        
        try {
          // Order data according to the required format:
          // Name, WhatsApp Number, ID National Number, Email, Education, University and College, Age, Gender
          await addToTable(companyName, eventName, [
            name,
            whatsappNumber,
            nationalId,
            email,
            education,
            universityCollege,
            age,
            gender,
            registrationDate, // Additional field for tracking
          ]);
          
          console.log('Registration successful');
          
          return NextResponse.json({
            success: true,
            message: 'Registration successful',
            registration: {
              name,
              email,
              registrationDate,
            },
          });
        } catch (error) {
          console.error('Error adding registration to table:', error);
          return NextResponse.json(
            { error: 'Failed to complete registration' },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('Error checking event:', error);
        return NextResponse.json(
          { error: 'Failed to verify event' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error checking company:', error);
      return NextResponse.json(
        { error: 'Failed to verify company' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json(
      { error: 'Failed to register for event' },
      { status: 500 }
    );
  }
} 