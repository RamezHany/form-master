'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface FormData {
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female';
  college: string;
  status: 'student' | 'graduate';
  nationalId: string;
}

interface Event {
  id: string;
  name: string;
  image: string | null;
  registrations: number;
  status?: string;
  companyStatus?: string;
  companyDeleted?: boolean;
}

export default function EventRegistrationPage() {
  const params = useParams();
  // Decode URL-encoded parameters
  const companyName = decodeURIComponent(params.company_name as string);
  const eventId = decodeURIComponent(params.event_id as string);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    college: '',
    status: 'student',
    nationalId: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [exactEventName, setExactEventName] = useState<string | null>(null);
  const [eventDisabled, setEventDisabled] = useState(false);
  const [companyDisabled, setCompanyDisabled] = useState(false);
  const [companyDeleted, setCompanyDeleted] = useState(false);

  useEffect(() => {
    // Fetch event details to verify it exists and get the image
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching events for company:', companyName);
        const response = await fetch(`/api/events?company=${encodeURIComponent(companyName)}`);
        
        if (!response.ok) {
          // Check if the company is disabled or deleted
          if (response.status === 403) {
            setCompanyDisabled(true);
            throw new Error('Company is disabled');
          } else if (response.status === 404) {
            setCompanyDeleted(true);
            throw new Error('Company not found');
          }
          throw new Error('Failed to fetch event details');
        }
        
        const data = await response.json();
        console.log('Events received:', data.events);
        
        // Find the event that matches (case insensitive)
        const normalizedEventId = eventId.trim().toLowerCase();
        const event = data.events.find(
          (e: Event) => e.id.trim().toLowerCase() === normalizedEventId
        );
        
        if (!event) {
          console.error('Event not found:', { eventId, availableEvents: data.events.map((e: Event) => e.id) });
          throw new Error('Event not found');
        }
        
        console.log('Found matching event:', event);
        setExactEventName(event.id); // Store the exact event name from the API
        
        // Check if event is disabled
        if (event.status === 'disabled') {
          setEventDisabled(true);
        }
        
        // Check if company is disabled
        if (event.companyStatus === 'disabled') {
          setCompanyDisabled(true);
        }
        
        // Check if company is deleted
        if (event.companyDeleted) {
          setCompanyDeleted(true);
        }
        
        if (event.image) {
          setEventImage(event.image);
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        if (!companyDisabled && !companyDeleted) {
          setError('Event not found or no longer available');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [companyName, eventId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exactEventName) {
      setError('Event information is missing. Please refresh the page and try again.');
      return;
    }
    
    // Check if event or company is disabled
    if (eventDisabled || companyDisabled) {
      setError('Registration is currently disabled for this event.');
      return;
    }
    
    // Validate form
    if (
      !formData.name ||
      !formData.phone ||
      !formData.email ||
      !formData.gender ||
      !formData.college ||
      !formData.status ||
      !formData.nationalId
    ) {
      setError('All fields are required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return;
    }
    
    // Validate phone number (simple validation)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Invalid phone number format');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      console.log('Submitting registration with:', {
        companyName,
        eventName: exactEventName, // Use the exact event name from the API
      });
      
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          eventName: exactEventName, // Use the exact event name from the API
          ...formData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register for event');
      }
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        gender: 'male',
        college: '',
        status: 'student',
        nationalId: '',
      });
    } catch (error) {
      console.error('Error registering for event:', error);
      setError(error instanceof Error ? error.message : 'Failed to register for event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error && !submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link href="/" className="text-blue-500 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (eventDisabled) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Registration Disabled</h2>
                <p className="text-gray-600 mb-6">
                  Registration for this event is currently disabled. Please contact the organizer for more information.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (companyDisabled) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Company Inactive</h2>
                <p className="text-gray-600 mb-6">
                  This company&apos;s events are currently not available. Please contact the administrator for more information.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading event details...</p>
            </div>
          ) : error || eventDisabled || companyDisabled || companyDeleted ? (
            <div className="p-8 text-center">
              <div className="text-red-500 text-5xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {companyDeleted ? 'Company Not Found' : 
                 companyDisabled ? 'Company Disabled' : 
                 eventDisabled ? 'Event Registration Closed' : 
                 'Event Not Found'}
              </h2>
              <p className="text-gray-600 mb-6">
                {companyDeleted ? 'This company no longer exists.' : 
                 companyDisabled ? 'This company is currently disabled. Registration is not available at this time.' : 
                 eventDisabled ? 'Registration for this event is currently closed.' : 
                 'The event you are looking for does not exist or is no longer available.'}
              </p>
              <Link href="/" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
                Return to Home
              </Link>
            </div>
          ) : (
            <div className="min-h-screen bg-gray-100 py-12">
              <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                {eventImage && (
                  <div className="w-full h-64 relative">
                    <Image
                      src={eventImage}
                      alt={`${companyName} - ${eventId} Event`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-center mb-2">
                    {eventId}
                  </h1>
                  <h2 className="text-xl text-gray-600 text-center mb-8">
                    Hosted by {companyName}
                  </h2>
                  
                  {success ? (
                    <div className="text-center">
                      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                        <p className="font-bold">Registration Successful!</p>
                        <p>Thank you for registering for this event.</p>
                      </div>
                      <button
                        onClick={() => setSuccess(false)}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Register Another Person
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                          {error}
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <label
                          htmlFor="name"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.name}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label
                          htmlFor="phone"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label
                          htmlFor="email"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.email}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label
                          htmlFor="gender"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Gender
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.gender}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      
                      <div className="mb-4">
                        <label
                          htmlFor="college"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          College
                        </label>
                        <input
                          type="text"
                          id="college"
                          name="college"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.college}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label
                          htmlFor="status"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.status}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        >
                          <option value="student">Student</option>
                          <option value="graduate">Graduate</option>
                        </select>
                      </div>
                      
                      <div className="mb-6">
                        <label
                          htmlFor="nationalId"
                          className="block text-gray-700 text-sm font-bold mb-2"
                        >
                          National ID
                        </label>
                        <input
                          type="text"
                          id="nationalId"
                          name="nationalId"
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={formData.nationalId}
                          onChange={handleChange}
                          disabled={submitting}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your National ID will only be visible to administrators.
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <button
                          type="submit"
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline w-full max-w-xs"
                          disabled={submitting}
                        >
                          {submitting ? 'Submitting...' : 'Register for Event'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 