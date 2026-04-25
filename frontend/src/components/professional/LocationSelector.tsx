'use client';

import { useState } from 'react';
import { createProfessionalLocationAuto, deleteProfessionalLocationAuto } from '@/app/actions/professionals';
import type { ProfessionalLocation } from '@/app/actions/professional-action-types';
import { TrashIcon, MapPin, Plus, X, Building, Loader2, CheckCircle2 } from 'lucide-react';

interface LocationSelectorProps {
    locations: ProfessionalLocation[];
    selectedLocationId: string;
    onSelectLocation: (id: string) => void;
    onLocationCreated: (location: ProfessionalLocation) => void;
    onLocationDeleted: (id: string) => void;
}

export function LocationSelector({
    locations = [],
    selectedLocationId,
    onSelectLocation,
    onLocationCreated,
    onLocationDeleted,
}: LocationSelectorProps) {
    const [showNewForm, setShowNewForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // 🚀 MEJORA NEXT.JS: Usamos FormData nativo en lugar de múltiples useState para los inputs
    const handleCreateLocation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const name = formData.get('name') as string;
        const address = formData.get('address') as string;

        if (!name.trim()) return;

        setIsCreating(true);
        setStatusMessage(null);

        try {
            const created = await createProfessionalLocationAuto({
                name: name.trim(),
                address: address.trim() || undefined,
            });

            onLocationCreated(created);
            setShowNewForm(false);
            form.reset(); // Limpieza nativa del formulario

            setStatusMessage({ type: 'success', text: 'Consultorio creado exitosamente.' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al crear locación.' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteLocation = async (locationId: string, locationName: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${locationName}"?`)) return;

        setDeletingId(locationId);
        setStatusMessage(null);

        try {
            await deleteProfessionalLocationAuto(locationId);
            onLocationDeleted(locationId);
        } catch (error) {
            setStatusMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al eliminar locación.' });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        // 🎨 MEJORA DISEÑO: Quitamos el borde/fondo blanco exterior para que se funda con el sidebar gris
        <section className="space-y-4">

            {/* Cabecera */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-800">
                    <Building className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-base font-bold">Mis Consultorios</h2>
                </div>
                <button
                    onClick={() => {
                        setShowNewForm(!showNewForm);
                        setStatusMessage(null);
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors ${showNewForm
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-semibold'
                        }`}
                >
                    {showNewForm ? <><X className="w-3.5 h-3.5" /> Cancelar</> : <><Plus className="w-3.5 h-3.5" /> Nuevo</>}
                </button>
            </div>

            {/* Formulario de creación limpio */}
            {showNewForm && (
                <form onSubmit={handleCreateLocation} className="space-y-3 p-3 bg-white rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <div>
                        <input
                            name="name"
                            type="text"
                            required
                            autoFocus
                            placeholder="Nombre (Ej: Consultorio Centro)"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                            disabled={isCreating}
                        />
                    </div>
                    <div>
                        <input
                            name="address"
                            type="text"
                            placeholder="Dirección (Opcional)"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                            disabled={isCreating}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg font-medium hover:bg-slate-900 disabled:opacity-60 transition-colors"
                    >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Consultorio'}
                    </button>
                </form>
            )}

            {/* Mensajes de feedback */}
            {statusMessage && (
                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                    {statusMessage.type === 'error' ? <X className="w-4 h-4 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 mt-0.5" />}
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* Lista de Consultorios optimizada para Sidebar */}
            <div className="space-y-2.5 overflow-y-auto pr-1">
                {locations.length === 0 && !showNewForm && (
                    <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-xl bg-white/50">
                        <MapPin className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                        <p className="text-sm font-medium">Sin consultorios</p>
                    </div>
                )}

                {locations.map((location) => {
                    const isSelected = selectedLocationId === location.id;
                    const isDeleting = deletingId === location.id;

                    return (
                        <div
                            key={location.id}
                            onClick={() => !isDeleting && onSelectLocation(location.id)}
                            className={`group flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected
                                ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                                } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {/* Lado izquierdo: Radio y Textos truncados */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Radio button */}
                                <div className="flex-shrink-0 mt-1">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600' : 'border-slate-300'
                                        }`}>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                                    </div>
                                </div>

                                {/* Textos flexibles con truncado perfecto */}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                        <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-emerald-900' : 'text-slate-700'
                                            }`}>
                                            {location.name}
                                        </h3>
                                        {location.isMainLocation && (
                                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                PRINCIPAL
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                        <MapPin className="w-3 h-3 flex-shrink-0 opacity-70" />
                                        <span className="truncate">{location.address || 'Sin dirección'}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Lado derecho: Basurero */}
                            {locations.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLocation(location.id, location.name);
                                    }}
                                    disabled={isDeleting}
                                    className="flex-shrink-0 ml-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Eliminar consultorio"
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <TrashIcon className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}