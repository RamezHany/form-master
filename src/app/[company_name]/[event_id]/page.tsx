'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface FormData {
  name: string;
  nationalId: string;
  passportNumber: string;
  phone: string;
  email: string;
  university: string;
  faculty: string;
  level: string;
  gender: 'male' | 'female';
  age: string;
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
    nationalId: '',
    passportNumber: '',
    phone: '',
    email: '',
    university: '',
    faculty: '',
    level: '',
    gender: 'male',
    age: '',
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
      !formData.phone ||
      !formData.email ||
      !formData.gender ||
      !formData.university ||
      !formData.faculty ||
      !formData.level ||
      !formData.age ||
      (!formData.nationalId && !formData.passportNumber)
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
        nationalId: '',
        passportNumber: '',
        phone: '',
        email: '',
        university: '',
        faculty: '',
        level: '',
        gender: 'male',
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-6 sm:py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {eventImage ? (
          <div className="relative">
            {/* Banner for desktop */}
            <div className="hidden sm:block relative w-full h-96">
              <Image
                src={eventImage}
                alt={`${companyName} - ${eventId} Event`}
                fill
                priority
                sizes="(min-width: 640px) 100vw, 0vw"
                quality={90}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h1 className="text-4xl font-bold mb-2 drop-shadow-md">
                  {eventId}
                </h1>
                <h2 className="text-xl drop-shadow-md flex items-center">
                  <span className="mr-2">Hosted by</span>
                  <span className="font-semibold">{companyName}</span>
                </h2>
              </div>
            </div>
            
            {/* Banner for mobile */}
            <div className="sm:hidden relative w-full h-64">
              <Image
                src={eventImage}
                alt={`${companyName} - ${eventId} Event`}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 0vw"
                quality={85}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h1 className="text-3xl font-bold mb-1 drop-shadow-md">
                  {eventId}
                </h1>
                <h2 className="text-lg drop-shadow-md flex items-center">
                  <span className="mr-2">Hosted by</span>
                  <span className="font-semibold">{companyName}</span>
                </h2>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <h1 className="text-4xl font-bold text-center mb-2">
              {eventId}
            </h1>
            <h2 className="text-xl text-center">
              Hosted by {companyName}
            </h2>
          </div>
        )}
        
        <div className="p-6 sm:p-10">
          {!eventImage && <div className="h-6"></div>}
          
          {success ? (
            <div className="text-center animate-fadeIn">
              <div className="bg-green-50 border-2 border-green-500 text-green-700 px-6 py-8 rounded-2xl mb-8">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p className="text-2xl font-bold mb-2">Registration Successful!</p>
                <p className="text-lg">Thank you for registering for this event.</p>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200 transform hover:scale-105"
              >
                Register Another Person
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="animate-fadeIn">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Registration Form</h3>
              
              {error && (
                <div className="bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl mb-8">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="col-span-full">
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
                    placeholder="Enter your full name"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
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
                    placeholder="If not Egyptian, type 'N/A'"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.nationalId}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="passportNumber"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Passport Number
                  </label>
                  <input
                    type="text"
                    id="passportNumber"
                    name="passportNumber"
                    placeholder="If not Egyptian, enter passport number"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.passportNumber}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="phone"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="Enter your mobile number"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
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
                    placeholder="Enter your email address"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="university"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    University
                  </label>
                  <input
                    type="text"
                    id="university"
                    name="university"
                    placeholder="Enter your university"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.university}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="faculty"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Faculty
                  </label>
                  <input
                    type="text"
                    id="faculty"
                    name="faculty"
                    placeholder="Enter your faculty"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.faculty}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="level"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Level
                  </label>
                  <select
                    id="level"
                    name="level"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.level}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  >
                    <option value="" disabled>Select your level</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                    <option value="graduate">Graduate</option>
                  </select>
                </div>
                
                <div className="col-span-1">
                  <label
                    htmlFor="gender"
                    className="block text-gray-700 text-sm font-bold mb-2"
                  >
                    Gender
                  </label>
                  <div className="flex space-x-4 mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="male"
                        checked={formData.gender === 'male'}
                        onChange={handleChange}
                        className="form-radio h-5 w-5 text-indigo-600"
                        disabled={submitting}
                      />
                      <span className="ml-2 text-gray-700">Male</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="gender"
                        value="female"
                        checked={formData.gender === 'female'}
                        onChange={handleChange}
                        className="form-radio h-5 w-5 text-indigo-600"
                        disabled={submitting}
                      />
                      <span className="ml-2 text-gray-700">Female</span>
                    </label>
                  </div>
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
                    min="16"
                    max="99"
                    placeholder="Enter your age"
                    className="shadow-sm border-2 border-gray-200 rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-center mt-10">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-full max-w-md transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
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
                    'Register Now'
                  )}
                </button>
              </div>
              
              <p className="text-center text-gray-500 text-xs mt-6">
                By registering, you agree to the event&apos;s terms and conditions.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 