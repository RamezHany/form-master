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
      whatsapp,
      email,
      gender,
      education,
      universityCollege,
      age,
      nationalId,
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
    if (!companyName || !eventName || !name || !whatsapp || !email || !gender || !education || !universityCollege || !age || !nationalId) {
      console.log('Validation failed - missing fields:', {
        companyName: !!companyName,
        eventName: !!eventName,
        name: !!name,
        whatsapp: !!whatsapp,
        email: !!email,
        gender: !!gender,
        education: !!education,
        universityCollege: !!universityCollege,
        age: !!age,
        nationalId: !!nationalId,
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
    if (!phoneRegex.test(whatsapp)) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp number format' },
        { status: 400 }
      );
    }
    
    // Validate age (must be a number)
    if (isNaN(Number(age)) || Number(age) < 15 || Number(age) > 100) {
      return NextResponse.json(
        { error: 'Please enter a valid age between 15 and 100' },
        { status: 400 }
      );
    }
    
    // Check if the company exists
    try {
      console.log('Checking if company exists:', companyName);
      const sheetData = await getSheetData(companyName);
      
      if (!sheetData || sheetData.length === 0) {
        console.error(`Company sheet ${companyName} is empty or does not exist`);
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }
      
      // Check if the company is disabled
      const companiesData = await getSheetData('companies');
      const companies = companiesData.slice(1); // Skip header row
      
      // Find the company
      const company = companies.find((row) => row[1] === companyName);
      
      if (company) {
        const status = company[5] || 'enabled';
        if (status === 'disabled') {
          return NextResponse.json(
            { error: 'Company is disabled, registration is not available' },
            { status: 403 }
          );
        }
      }
      
      // Check if the event exists
      try {
        console.log('Checking if event exists:', { companyName, eventName });
        const tableData = await getTableData(companyName, eventName);
        
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
        const existingRegistration = registrationData.find(
          (row) => row[2] === email || row[1] === whatsapp
        );
        
        if (existingRegistration) {
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
        
        await addToTable(companyName, eventName, [
          name,
          whatsapp,
          nationalId,
          email,
          education,
          universityCollege,
          age,
          gender,
          registrationDate,
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
        console.error('Error checking event:', error);
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('Error checking company:', error);
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
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