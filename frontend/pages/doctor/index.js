import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DoctorIndex() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('doctor_token') : null;
    if (token) {
      router.replace('/doctor/dashboard');
    } else {
      router.replace('/doctor/login');
    }
  }, [router]);

  return null;
}

