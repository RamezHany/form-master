'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface FormData {
  name: string;
  whatsapp: string;
  nationalId: string;
  email: string;
  education: 'student' | 'graduate' | 'other';
  universityCollege: string;
  age: string;
  gender: 'male' | 'female';
}

interface Event {
  id: string;
  name: string;
  image: string | null;
  registrations: number;
  status?: string;
  companyStatus?: string;
}

export default function EventRegistrationPage() {
  const params = useParams();
  // Decode URL-encoded parameters
  const companyName = decodeURIComponent(params.company_name as string);
  const eventId = decodeURIComponent(params.event_id as string);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    whatsapp: '',
    nationalId: '',
    email: '',
    education: 'student',
    universityCollege: '',
    age: '',
    gender: 'male',
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [exactEventName, setExactEventName] = useState<string | null>(null);
  const [eventDisabled, setEventDisabled] = useState(false);
  const [companyDisabled, setCompanyDisabled] = useState(false);

  useEffect(() => {
    // Fetch event details to verify it exists and get the image
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching events for company:', companyName);
        const response = await fetch(`/api/events?company=${encodeURIComponent(companyName)}`);
        
        if (!response.ok) {
          // Check if the company is disabled
          if (response.status === 403) {
            setCompanyDisabled(true);
            throw new Error('Company is disabled');
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
        
        if (event.image) {
          setEventImage(event.image);
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        if (!companyDisabled) {
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
      !formData.whatsapp ||
      !formData.email ||
      !formData.gender ||
      !formData.education ||
      !formData.universityCollege ||
      !formData.nationalId ||
      !formData.age
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
    if (!phoneRegex.test(formData.whatsapp)) {
      setError('Invalid WhatsApp number format');
      return;
    }
    
    // Validate age (must be a number)
    if (isNaN(Number(formData.age)) || Number(formData.age) < 15 || Number(formData.age) > 100) {
      setError('Please enter a valid age between 15 and 100');
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
        whatsapp: '',
        email: '',
        gender: 'male',
        education: 'student',
        universityCollege: '',
        nationalId: '',
        age: '',
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
    <div className="min-h-screen bg-gray-100 py-6 sm:py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {eventImage ? (
          <div className="relative">
            {/* Banner for desktop */}
            <div className="hidden sm:block relative w-full h-80">
              <Image
                src={eventImage}
                alt={`${companyName} - ${eventId} Event`}
                fill
                priority
                sizes="(min-width: 640px) 100vw, 0vw"
                quality={90}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h1 className="text-3xl font-bold mb-1 drop-shadow-md">
                  {eventId}
                </h1>
                <h2 className="text-xl drop-shadow-md">
                  Hosted by {companyName}
                </h2>
              </div>
            </div>
            
            {/* Banner for mobile */}
            <div className="sm:hidden relative w-full h-56">
              <Image
                src={eventImage}
                alt={`${companyName} - ${eventId} Event`}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 0vw"
                quality={85}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h1 className="text-2xl font-bold mb-1 drop-shadow-md">
                  {eventId}
                </h1>
                <h2 className="text-lg drop-shadow-md">
                  Hosted by {companyName}
                </h2>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h1 className="text-3xl font-bold text-center mb-2">
              {eventId}
            </h1>
            <h2 className="text-xl text-center">
              Hosted by {companyName}
            </h2>
          </div>
        )}
        
        <div className="p-6 sm:p-8">
          {!eventImage && <div className="h-6"></div>}
          
          {success ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                <p className="font-bold">Registration Successful!</p>
                <p>Thank you for registering for this event.</p>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
              >
                Register Another Person
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="animate-fadeIn">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-1">
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
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="whatsapp"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="whatsapp"
                    name="whatsapp"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                    placeholder="e.g. 01234567890"
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="nationalId"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    National ID Number
                  </label>
                  <input
                    type="text"
                    id="nationalId"
                    name="nationalId"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.nationalId}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your National ID will only be visible to administrators.
                  </p>
                </div>
                
                <div className="col-span-1">
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
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="education"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Education
                  </label>
                  <select
                    id="education"
                    name="education"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.education}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="graduate">Graduate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="universityCollege"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    University and College
                  </label>
                  <input
                    type="text"
                    id="universityCollege"
                    name="universityCollege"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.universityCollege}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                    placeholder="e.g. Cairo University - Faculty of Engineering"
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="age"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Age
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    min="15"
                    max="100"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="gender"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-8">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-8 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full max-w-xs transition-all duration-200 transform hover:scale-105"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Register for Event'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 