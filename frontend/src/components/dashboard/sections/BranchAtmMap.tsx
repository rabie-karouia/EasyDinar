import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Define custom icons
const userLocationIcon = new L.Icon({
  iconUrl: "/icons/placeholder.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const branchIcon = new L.Icon({
  iconUrl: "/icons/bank.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const atmIcon = new L.Icon({
  iconUrl: "/icons/atm-card.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

interface Location {
  id: string;
  name: string;
  type: "branch" | "atm";
  address: string;
  hours?: string;
  latitude: number;
  longitude: number;
}

// Component to dynamically set the map's center
const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

export default function BranchAtmMap() {
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.8065, 10.1815]); // Default to Tunis
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all branches and ATMs when the component loads
    fetch("http://localhost:8000/branches-atms")
      .then((response) => response.json())
      .then((data) => {
        setAllLocations(data);
        setFilteredLocations(data); // Display all locations by default
        setLoading(false);
      })
      .catch((fetchError) => {
        console.error("Error fetching locations:", fetchError);
        setError("Failed to fetch locations. Please try again.");
        setLoading(false);
      });

    // Fetch user's location using IP-based geolocation
    fetch("https://ipinfo.io/json?token=eac17767de3213")
      .then((response) => response.json())
      .then((data) => {
        const [latitude, longitude] = data.loc.split(",");
        const userPosition: [number, number] = [parseFloat(latitude), parseFloat(longitude)];
        setUserLocation(userPosition);
        setMapCenter(userPosition); // Center the map on the user's location
      })
      .catch((geoError) => {
        console.error("Error fetching user location via IP:", geoError);
        setError("Unable to retrieve your location. Please check your network.");
      });
  }, []);

  const handleNearbyServices = () => {
    if (userLocation) {
      // Fetch nearby branches and ATMs
      fetch(`http://localhost:8000/branches-atms/nearby?latitude=${userLocation[0]}&longitude=${userLocation[1]}&radius=2`)
        .then((response) => response.json())
        .then((data) => {
          setFilteredLocations(data); // Update the filtered list to show nearby services
          setMapCenter(userLocation); // Center the map on the user's location
        })
        .catch((fetchError) => {
          console.error("Error fetching nearby locations:", fetchError);
          setError("Failed to fetch nearby locations. Please try again.");
        });
    } else {
      setError("Unable to determine your location for nearby services.");
    }
  };

  const handleAllServices = () => {
    setFilteredLocations(allLocations); // Reset to display all branches and ATMs
    setMapCenter(userLocation || [36.8065, 10.1815]); // Reset map center
    setError(null); // Clear any existing error
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Branches & ATMs</h2>
        <div className="flex space-x-4">
          <button
            onClick={handleNearbyServices}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <span>Nearby Services</span>
          </button>
          <button
            onClick={handleAllServices}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            <span>All Services</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="h-[calc(100vh-150px)] w-full"> {/* Adjust map height to fit the page */}
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <RecenterMap center={mapCenter} />

            {userLocation && (
              <Marker position={userLocation} icon={userLocationIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {filteredLocations.map((location) => (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={location.type === "branch" ? branchIcon : atmIcon}
              >
                <Popup>
                  <div>
                    <h3>{location.name}</h3>
                    <p>{location.address}</p>
                    {location.hours && <p>Hours: {location.hours}</p>}
                    <p>Type: {location.type}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
