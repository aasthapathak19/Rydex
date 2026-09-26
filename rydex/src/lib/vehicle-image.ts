/** Accept only small raster vehicle photos; PDF, SVG and video are unsupported. */
export async function validVehicleImage(file: File) {
    if (file.size === 0 || file.size > 5 * 1024 * 1024) return false
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    return (file.type === "image/png" && png) || (file.type === "image/jpeg" && jpg) || (file.type === "image/webp" && webp)
}
