'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Company {
  id: string;
  name: string;
  username: string;
  image: string | null;
  status?: string;
  deleted?: boolean;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session.user.type !== 'admin') {
      router.push('/');
      return;
    }

    // Fetch companies
    if (status === 'authenticated') {
      fetchCompanies();
    }
  }, [status, session, router]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await response.json();
      console.log("Companies data:", data.companies);
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to mark this company as deleted? This will rename its sheet and prevent users from registering for its events.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/companies?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete company');
      }
      
      // Refresh companies list
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Failed to delete company');
    }
  };

  const handleRestoreCompany = async (id: string) => {
    if (!confirm('Are you sure you want to restore this company? This will make it visible to users again.')) {
      return;
    }
    
    try {
      const company = companies.find(c => c.id === id);
      if (!company) return;
      
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          deleted: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore company');
      }
      
      // Refresh companies list
      fetchCompanies();
    } catch (error) {
      console.error('Error restoring company:', error);
      setError('Failed to restore company');
    }
  };

  const handleToggleCompanyStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'disabled' ? 'enabled' : 'disabled';
      
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update company status');
      }
      
      // Refresh companies list
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company status:', error);
      setError('Failed to update company status');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, Admin</span>
            <button
              onClick={() => router.push('/api/auth/signout')}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Companies</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className={`py-2 px-4 rounded ${showDeleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
              </button>
              <Link
                href="/control_admin/add-company"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Add Company
              </Link>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-2">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <p className="text-gray-500">No companies found. Add your first company!</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {companies
                  .filter(company => showDeleted ? company.deleted : !company.deleted)
                  .map((company) => (
                    <li key={company.id} className={`px-6 py-4 flex items-center justify-between ${company.deleted ? 'bg-gray-100' : ''}`}>
                      <div className="flex items-center">
                        {company.image ? (
                          <div className="h-12 w-12 mr-4 relative">
                            <Image
                              src={company.image}
                              alt={company.name}
                              fill
                              className="rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 mr-4 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-500 text-lg">
                              {company.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{company.name}</h3>
                          <div className="flex items-center">
                            <p className="text-sm text-gray-500 mr-2">@{company.username}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              company.status === 'disabled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {company.status || 'enabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/control_admin/company/${company.id}`}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded"
                        >
                          View Events
                        </Link>
                        <Link
                          href={`/control_admin/company/${company.id}`}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-semibold py-2 px-4 rounded"
                        >
                          Edit
                        </Link>
                        <div className="flex items-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={company.status !== 'disabled'}
                              onChange={() => handleToggleCompanyStatus(company.id, company.status || 'enabled')}
                            />
                            <div className={`relative w-11 h-6 ${company.status === 'disabled' ? 'bg-gray-200' : 'bg-blue-600'} rounded-full peer after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${company.status !== 'disabled' ? 'after:translate-x-full' : ''}`}></div>
                            <span className="ms-3 text-sm font-medium text-gray-900">
                              {company.status === 'disabled' ? 'Disabled' : 'Enabled'}
                            </span>
                          </label>
                        </div>
                        {!company.deleted && (
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded"
                          >
                            Delete
                          </button>
                        )}
                        {company.deleted && (
                          <button
                            onClick={() => handleRestoreCompany(company.id)}
                            className="bg-green-100 hover:bg-green-200 text-green-800 font-semibold py-2 px-4 rounded"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 