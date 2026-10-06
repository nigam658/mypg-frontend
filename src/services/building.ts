import { API_BASE_URL } from "../config/api";
import { authenticatedFetch } from "./auth";


export const getMyBuildings = async () => {

  const response = await authenticatedFetch(
    `${API_BASE_URL}/buildings/my-buildings`
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

      // Building occupancy summary
      totalRooms: building.total_rooms,
      totalBeds: building.total_beds,
      occupiedBeds: building.occupied_beds,
      availableBeds: building.available_beds,
    })),
  };
};

// floor fetch API 
export const getFloorsByBuildingId = async (buildingId: number) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/floors/building/${buildingId}`
  );

  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_FLOORS");
  }

  const data = await response.json();

  console.log(
    "CURRENT FLOORS:",
    JSON.stringify(data, null, 2)
  );

  return data.map((floor: any) => ({
    id: floor.floor_id,
    floorNumber: floor.floor_number,
  }));
};

// Add floor
export const addFloor = async (
  buildingId: number,
  floorNumber: number
) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/floors/${buildingId}`,
    {
      method: "POST",
      body: JSON.stringify({
        floor_number: floorNumber,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail || "Failed to add floor"
    );
  }

  return await response.json();
};

// Delete floor
export const deleteFloor = async (floorId: number) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/floors/${floorId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail || "Failed to delete floor"
    );
  }

  return await response.json();
};

// room fetch API  
export const getRoomsByFloorId = async (floorId: number) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/rooms/floor/${floorId}`
  );

  if (!response.ok) {
    throw new Error("FAILED_TO_FETCH_ROOMS");
  }

  const data = await response.json();

  console.log(
    "RAW ROOM API RESPONSE:",
    JSON.stringify(data, null, 2)
  );

  return data.map((room: any) => ({
    id: room.id,
    roomNumber: room.room_number,
    totalBeds: room.total_beds,
    occupiedBeds: room.occupied_beds,
    unpaidTenants: room.unpaid_tenants,
  }));
};

export const addRoom = async (data: {
  floor_id: number;
  room_number: string;
  number_of_beds: number;
}) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/rooms/AddRoom`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail || "Failed to add room"
    );
  }

  return await response.json();
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
        `${API_BASE_URL}/buildings/quick_building_setup`,
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

// Delete a room
export const deleteRoom = async (roomId: number) => {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/rooms/${roomId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.detail || "Failed to delete room"
    );
  }

  return await response.json();
};