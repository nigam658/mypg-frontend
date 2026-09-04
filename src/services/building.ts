import { authenticatedFetch } from "./auth";

// buildings fetch API for home page 
const API_URL =
  "https://retainer-preamble-lifting.ngrok-free.dev";

export const getMyBuildings = async () => {

  const response = await authenticatedFetch(
    `${API_URL}/buildings/my-buildings`
  );

  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_BUILDINGS");
  }

  const data = await response.json();

  return {
    ...data,
    buildings: data.buildings.map((building: any) => ({
      id: building.id,
      name: building.name,
      address: building.address,
      totalRooms: building.total_rooms,
    })),
  };
};

// floor fetch API 
export const getFloorsByBuildingId = async (buildingId: number) => {
  const response = await authenticatedFetch(
    `${API_URL}/floors/building/${buildingId}`
  );

  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_FLOORS");
  }

  const data = await response.json();

  return data.map((floor: any) => ({
    id: floor.floor_id,
    floorNumber: floor.floor_number,
  }));
};

// room fetch API  
export const getRoomsByFloorId = async (floorId: number) => {
  const response = await authenticatedFetch(
    `${API_URL}/rooms/floor/${floorId}`
  );

  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_ROOMS");
  }

  const data = await response.json();

  return data.map((room: any) => ({
    id: room.id,
    roomNumber: room.room_number,
    totalBeds: room.total_beds,
  }));
};


export const createPG = async (data: {
    name: string;
    address: string;
    city: string;
    number_of_floors?: number;
    rooms_per_floor?: number;
    beds_per_room?: number;
}) => {

    const response = await authenticatedFetch(
        "https://retainer-preamble-lifting.ngrok-free.dev/buildings/quick_building_setup",
        {
            method: "POST",
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
            errorData.detail || "Failed to create PG"
        );
    }

    return await response.json();
};