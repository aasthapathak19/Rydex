export const VEHICLE_FIELDS = "owner type vehicleModel number imageUrl baseFare pricePerKM waitingCharge status rejectionReason isActive createdAt updatedAt"
export const PROFILE_FIELDS = "name email role mobileNumber partnerStatus partnerOnBoardingSteps partnerApplicationSubmittedAt rejectionReason isEmailVerified isOnline createdAt updatedAt"

type ApplicationVehicle = {
    type?: string; vehicleModel?: string; number?: string; imageUrl?: string;
    baseFare?: number; pricePerKM?: number; waitingCharge?: number;
}

export function hasPricing(vehicle: ApplicationVehicle | null) {
    return !!vehicle?.imageUrl && [vehicle.baseFare, vehicle.pricePerKM, vehicle.waitingCharge]
        .every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)
}

export function applicationComplete(partner: { name?: string; email?: string; mobileNumber?: string }, vehicle: ApplicationVehicle | null) {
    return !!(partner.name && partner.email && partner.mobileNumber && vehicle?.type && vehicle.vehicleModel && vehicle.number && hasPricing(vehicle))
}

export function onlyFields(value: unknown, allowed: readonly string[]): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key))
}

export function validText(value: unknown, max: number): value is string {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
}
