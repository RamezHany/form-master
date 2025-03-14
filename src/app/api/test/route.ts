import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, getTableData } from '@/lib/sheets';

interface TestResponse {
  status: string;
  timestamp: string;
  query: {
    company: string | null;
    event: string | null;
  };
  results: {
    company?: {
      found: boolean;
      rowCount?: number;
      error?: string;
    };
    event?: {
      found: boolean;
      rowCount?: number;
      headers?: string[];
      error?: string;
    };
    companies?: {
      found: boolean;
      rowCount?: number;
      list?: Array<{
        id: string;
        name: string;
        status: string;
      }>;
      error?: string;
    };
  };
}

// Define a custom error type
interface ApiError extends Error {
  code?: string;
  status?: number;
}

// GET /api/test - Test API endpoint
export async function GET(request: NextRequest) {
  try {
    // Get parameters from query
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const event = searchParams.get('event');
    
    const response: TestResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      query: {
        company,
        event
      },
      results: {}
    };
    
    // If company is provided, try to get company data
    if (company) {
      try {
        const companyData = await getSheetData(company);
        response.results.company = {
          found: true,
          rowCount: companyData.length
        };
        
        // If event is provided, try to get event data
        if (event) {
          try {
            const eventData = await getTableData(company, event);
            response.results.event = {
              found: true,
              rowCount: eventData.length,
              headers: eventData[0]
            };
          } catch (error: unknown) {
            const apiError = error as ApiError;
            response.results.event = {
              found: false,
              error: apiError.message || 'Unknown error occurred'
            };
          }
        }
      } catch (error: unknown) {
        const apiError = error as ApiError;
        response.results.company = {
          found: false,
          error: apiError.message || 'Unknown error occurred'
        };
      }
    }
    
    // Try to get companies list
    try {
      const companiesData = await getSheetData('companies');
      response.results.companies = {
        found: true,
        rowCount: companiesData.length,
        list: companiesData.slice(1).map(row => ({
          id: row[0],
          name: row[1],
          status: row[5] || 'enabled'
        }))
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      response.results.companies = {
        found: false,
        error: apiError.message || 'Unknown error occurred'
      };
    }
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    const apiError = error as ApiError;
    return NextResponse.json(
      { 
        status: 'error',
        message: apiError.message || 'Unknown error occurred',
        stack: apiError.stack
      },
      { status: 500 }
    );
  }
} 