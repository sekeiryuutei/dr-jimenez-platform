import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PacienteIndex() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('patient_token') : null;
    if (token) {
      router.replace('/paciente/dashboard');
    } else {
      router.replace('/paciente/login');
    }
  }, [router]);

  return null;
}

