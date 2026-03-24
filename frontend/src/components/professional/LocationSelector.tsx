'use client';

import { useState, useCallback } from 'react';
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
    locations = [], // Valor por defecto por seguridad
    selectedLocationId,
    onSelectLocation,
    onLocationCreated,
    onLocationDeleted,
}: LocationSelectorProps) {
    const [showNewForm, setShowNewForm] = useState(false);
    const [newLocationName, setNewLocationName] = useState('');
    const [newLocationAddress, setNewLocationAddress] = useState('');

    // Separamos los estados de carga para mejor UX
    const [isCreating, setIsCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleCreateLocation = useCallback(async (e: React.FormEvent) => {
        e.preventDefault(); // Previene la recarga al usar Enter

        if (!newLocationName.trim()) {
            setStatusMessage({ type: 'error', text: 'El nombre de la locación es requerido.' });
            return;
        }

        setIsCreating(true);
        setStatusMessage(null);

        try {
            const created = await createProfessionalLocationAuto({
                name: newLocationName.trim(),
                address: newLocationAddress.trim() || undefined,
            });
            onLocationCreated(created);
            setNewLocationName('');
            setNewLocationAddress('');
            setShowNewForm(false);
            setStatusMessage({ type: 'success', text: 'Consultorio creado exitosamente.' });

            // Limpiamos el mensaje de éxito después de 3 segundos
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al crear locación.';
            setStatusMessage({ type: 'error', text: msg });
        } finally {
            setIsCreating(false);
        }
    }, [newLocationName, newLocationAddress, onLocationCreated]);

    const handleDeleteLocation = useCallback(async (locationId: string, locationName: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${locationName}"?`)) {
            return;
        }

        setDeletingId(locationId);
        setStatusMessage(null);

        try {
            await deleteProfessionalLocationAuto(locationId);
            onLocationDeleted(locationId);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al eliminar locación.';
            setStatusMessage({ type: 'error', text: msg });
        } finally {
            setDeletingId(null);
        }
    }, [onLocationDeleted]);

    return (
        <section className="rounded-xl p-6 shadow-sm border border-slate-200 bg-white space-y-5">
            {/* Cabecera */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                    <Building className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-semibold">Mis Consultorios</h2>
                </div>
                <button
                    onClick={() => {
                        setShowNewForm(!showNewForm);
                        setStatusMessage(null);
                    }}
                    className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-md transition-colors ${showNewForm
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium'
                        }`}
                >
                    {showNewForm ? <><X className="w-4 h-4" /> Cancelar</> : <><Plus className="w-4 h-4" /> Nuevo</>}
                </button>
            </div>

            {/* Formulario de creación envuelto en <form> */}
            {showNewForm && (
                <form onSubmit={handleCreateLocation} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nombre del consultorio *</label>
                        <input
                            id="name"
                            type="text"
                            autoFocus
                            placeholder="Ej: Consultorio Centro"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            disabled={isCreating}
                        />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">Dirección (Opcional)</label>
                        <input
                            id="address"
                            type="text"
                            placeholder="Ej: Av. Siempreviva 742"
                            value={newLocationAddress}
                            onChange={(e) => setNewLocationAddress(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            disabled={isCreating}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating || !newLocationName.trim()}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 mt-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Consultorio'}
                    </button>
                </form>
            )}

            {/* Mensajes de feedback */}
            {statusMessage && (
                <div className={`p-3 rounded-md text-sm flex items-start gap-2 ${statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                    {statusMessage.type === 'error' ? <X className="w-4 h-4 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 mt-0.5" />}
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* Lista de Consultorios */}
            <div className="space-y-3">
                {locations.length === 0 && !showNewForm && (
                    <div className="text-center py-6 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                        <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm">No tienes consultorios registrados.</p>
                    </div>
                )}

                {locations.map((location) => {
                    const isSelected = selectedLocationId === location.id;
                    const isDeleting = deletingId === location.id;

                    return (
                        <div
                            key={location.id}
                            onClick={() => !isDeleting && onSelectLocation(location.id)}
                            className={`group relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                                } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <div className="flex-shrink-0 mt-0.5 mr-3">
                                {isSelected ? (
                                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-emerald-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900 truncate">{location.name}</h3>
                                    {location.isMainLocation && (
                                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 rounded-full">
                                            Principal
                                        </span>
                                    )}
                                </div>

                                {location.address ? (
                                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{location.address}</span>
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-400 mt-1 italic">Sin dirección especificada</p>
                                )}
                            </div>

                            {/* Botón de eliminar - Solo visible si hay más de 1 locación */}
                            {locations.length > 1 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLocation(location.id, location.name);
                                    }}
                                    disabled={isDeleting || isCreating}
                                    title="Eliminar consultorio"
                                    className="ml-3 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                    ) : (
                                        <TrashIcon className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}