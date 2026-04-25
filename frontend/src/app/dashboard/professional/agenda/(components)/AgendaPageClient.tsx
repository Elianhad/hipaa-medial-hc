'use client';

import { useState } from 'react';
import type { ProfessionalLocation } from '@/app/actions/professional-action-types';
import { LocationSelector } from '@/components/professional/LocationSelector';
import { AgendaForm } from '@/components/professional/AgendaForm';
import { MapPin } from 'lucide-react';

interface AgendaPageClientProps {
    initialLocations: ProfessionalLocation[];
}

export function AgendaPageClient({ initialLocations }: AgendaPageClientProps) {
    const [locations, setLocations] = useState<ProfessionalLocation[]>(initialLocations);

    // Seleccionamos el primer consultorio por defecto si existe
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
        initialLocations.length > 0 ? initialLocations[0].id : null
    );

    const handleLocationCreated = (newLocation: ProfessionalLocation) => {
        setLocations(prev => [...prev, newLocation]);
        setSelectedLocationId(newLocation.id); // Seleccionar automáticamente el nuevo
    };

    const handleLocationDeleted = (deletedId: string) => {
        setLocations(prev => {
            const updated = prev.filter(loc => loc.id !== deletedId);
            // Si borramos el que estaba seleccionado, seleccionamos otro (o null)
            if (selectedLocationId === deletedId) {
                setSelectedLocationId(updated.length > 0 ? updated[0].id : null);
            }
            return updated;
        });
    };

    const handleLocationUpdated = (updatedLocation: ProfessionalLocation) => {
        setLocations(prev =>
            prev.map(loc => loc.id === updatedLocation.id ? updatedLocation : loc)
        );
    };

    const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">

            {/* PANEL IZQUIERDO: Selector de Consultorios (El "Master") */}
            <div className="w-full md:w-1/3 xl:w-1/4 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-0 flex flex-col">
                {/* Le pasamos un prop para decirle al LocationSelector que no dibuje 
                  su propio borde/fondo blanco, ya que ahora vive dentro de este panel gris.
                  Si no quieres modificar LocationSelector, el CSS de abajo lo integra bastante bien.
                */}
                <div className="p-4 flex-1">
                    <LocationSelector
                        locations={locations}
                        selectedLocationId={selectedLocationId || ''}
                        onSelectLocation={setSelectedLocationId}
                        onLocationCreated={handleLocationCreated}
                        onLocationDeleted={handleLocationDeleted}
                    />
                </div>
            </div>

            {/* PANEL DERECHO: Formulario de Agenda (El "Detalle") */}
            <div className="w-full md:w-2/3 xl:w-3/4 bg-white p-4 md:p-8 overflow-y-auto">
                {selectedLocation ? (
                    <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                        {/* La key es CRÍTICA. Obliga a React a destruir y recrear el 
                          formulario cuando cambias de consultorio, evitando bugs visuales.
                        */}
                        <AgendaForm
                            key={selectedLocation.id}
                            location={selectedLocation}
                            onUpdate={handleLocationUpdated}
                        />
                    </div>
                ) : (
                    // Estado vacío por si borra todos los consultorios
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-slate-500">Ningún consultorio seleccionado</p>
                        <p className="text-sm">Crea o selecciona un consultorio en el panel lateral para configurar su agenda.</p>
                    </div>
                )}
            </div>

        </div>
    );
}