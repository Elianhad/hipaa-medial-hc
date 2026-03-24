'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/SessionProvider';

type RegisterRole = 'professional' | 'adminOrg';

function splitName(user: Record<string, unknown> | null | undefined): { firstName: string; lastName: string } {
    const givenName = typeof user?.given_name === 'string' ? user.given_name.trim() : '';
    const familyName = typeof user?.family_name === 'string' ? user.family_name.trim() : '';

    if (givenName || familyName) {
        return { firstName: givenName, lastName: familyName };
    }

    const fullName = typeof user?.name === 'string' ? user.name.trim() : '';
    if (!fullName) {
        return { firstName: '', lastName: '' };
    }

    const parts = fullName.split(' ').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) {
        return { firstName: parts[0] ?? '', lastName: '' };
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
}

export default function NewTenantPage() {
    const router = useRouter();
    const { user, isLoading: isUserLoading, refreshSession } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [role, setRole] = useState<RegisterRole>('professional');

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [tenantName, setTenantName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [consultationFee, setConsultationFee] = useState('');

    useEffect(() => {
        if (!user) {
            return;
        }

        const { firstName: resolvedFirstName, lastName: resolvedLastName } = splitName(user);
        const resolvedEmail = typeof user.email === 'string' ? user.email.trim() : '';

        setFirstName((current) => current || resolvedFirstName);
        setLastName((current) => current || resolvedLastName);
        setEmail((current) => current || resolvedEmail);
    }, [user]);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/login?returnTo=/new-tenant');
        }
    }, [isUserLoading, user, router]);

    if (!isUserLoading && !user) {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const payload = {
                role,
                firstName,
                lastName,
                email,
                tenantName,
                subdomain,
                licenseNumber: role === 'professional' ? licenseNumber : undefined,
                specialty: role === 'professional' ? specialty || undefined : undefined,
                consultationFee: role === 'professional' && consultationFee.trim() ? Number(consultationFee) : undefined,
            };

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = data?.message;
                throw new Error(Array.isArray(message) ? message.join(', ') : message || 'Error al registrar usuario');
            }

            // El registro en el backend fue exitoso.
            // Ahora necesitamos forzar un re-login para que Auth0 emita un nuevo JWT
            // que incluya el rol/permiso recién asignado via M2M.
            //
            // ✅ En @auth0/nextjs-auth0 v4 (App Router), el middleware monta las rutas
            //    bajo /auth/* (NO /api/auth/*). Por eso usamos /auth/login.
            //
            // ✅ prompt=none → Auth0 usa la sesión SSO existente (silent login).
            //    Si la sesión SSO sigue activa, el usuario no verá un login screen.
            //    Auth0 emitirá un JWT nuevo con los roles actualizados.
            //
            // ⚠️ refreshSession() del cliente NO actualiza el JWT — el SDK v4 renueva
            //    el access token server-side, pero el token en el contexto del cliente
            //    no reflejará los roles hasta un re-login completo.
            const returnUrl = role === 'adminOrg' ? '/dashboard/organization' : '/dashboard/professional';
            window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnUrl)}&prompt=none`;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-700 flex items-center justify-center p-4">
            <div className="bg-gray-100 rounded-lg shadow-md p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Alta de Usuario y Tenant</h1>
                <p className="mb-4 text-sm text-gray-600">
                    Usamos tu identidad autenticada para completar nombre y email. Acá solo definís tu perfil dentro de HEED.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        value={firstName}
                        placeholder={firstName ?? 'Introduce tu Nombre'}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
                    />
                    <input
                        value={lastName}
                        placeholder={lastName ?? 'Introduce tu Apellido'}
                        onChange={(e) => setLastName(e.target.value)}
                        className="px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
                    />
                    <input
                        type="email"
                        value={email}
                        placeholder={email ?? 'Introduce tu Email'}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
                    />

                    <input
                        type="text"
                        placeholder="Nombre de tenant (ej: Clínica San Martín)"
                        required
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <input
                        type="text"
                        placeholder="Subdominio (ej: clinica-san-martin)"
                        required
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value as RegisterRole)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="professional">Profesional</option>
                        <option value="adminOrg">Administrador de Organización</option>
                    </select>

                    {role === 'professional' && (
                        <>
                            <input
                                type="text"
                                placeholder="Matrícula profesional"
                                required
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                type="text"
                                placeholder="Especialidad (opcional)"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                type="number"
                                placeholder="Honorario (opcional)"
                                min="0"
                                value={consultationFee}
                                onChange={(e) => setConsultationFee(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </>
                    )}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting || isUserLoading || !firstName || !lastName || !email}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creando...' : 'Crear Usuario'}
                    </button>
                </form>
            </div>
        </div>
    );
}