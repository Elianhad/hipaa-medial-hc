'use client';

import { useState, useCallback } from 'react';
import { ProfessionalLocation } from '@/app/actions/professional-action-types';
import { LocationSelector } from '@/components/professional/LocationSelector';
import { AgendaForm } from '@/components/professional/AgendaForm';

interface AgendaPageClientProps {
    initialLocations: ProfessionalLocation[];
}

export function AgendaPageClient({ initialLocations }: AgendaPageClientProps) {
    const [locations, setLocations] = useState<ProfessionalLocation[]>(initialLocations);
    const [selectedLocationId, setSelectedLocationId] = useState<string>(
        initialLocations[0]?.id || '',
    );

    const selectedLocation = locations.find((loc) => loc.id === selectedLocationId);

    const handleLocationCreated = useCallback((newLocation: ProfessionalLocation) => {
        setLocations((prev) => [...prev, newLocation]);
        setSelectedLocationId(newLocation.id);
    }, []);

    const handleLocationDeleted = useCallback((deletedId: string) => {
        setLocations((prev) => prev.filter((loc) => loc.id !== deletedId));
        const remaining = locations.filter((loc) => loc.id !== deletedId);
        if (remaining.length > 0) {
            setSelectedLocationId(remaining[0].id);
        }
    }, [locations]);

    const handleLocationUpdated = useCallback((updated: ProfessionalLocation) => {
        setLocations((prev) =>
            prev.map((loc) => (loc.id === updated.id ? updated : loc)),
        );
    }, []);

    return (
        <div className="space-y-6">
            <LocationSelector
                locations={locations}
                selectedLocationId={selectedLocationId}
                onSelectLocation={setSelectedLocationId}
                onLocationCreated={handleLocationCreated}
                onLocationDeleted={handleLocationDeleted}
            />

            {selectedLocation && (
                <AgendaForm
                    location={selectedLocation}
                    onUpdate={handleLocationUpdated}
                />
            )}
        </div>
    );
}
