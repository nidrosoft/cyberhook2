const ALLOWED_LOGO_EXTENSIONS = ["gif", "png", "jpg", "jpeg", "jfif"];
const ALLOWED_LOGO_TYPES = ["image/gif", "image/png", "image/jpeg", "image/jpg", "image/jfif"];

function getExtension(fileName: string): string {
    return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Unable to read image dimensions."));
        };
        image.src = url;
    });
}

export async function validateCompanyLogo(file: File): Promise<string | null> {
    const extension = getExtension(file.name);
    if (!ALLOWED_LOGO_EXTENSIONS.includes(extension) && !ALLOWED_LOGO_TYPES.includes(file.type.toLowerCase())) {
        return "Allowed formats: GIF, PNG, JPG, JPEG, JFIF.";
    }

    const dimensions = await readImageDimensions(file);
    if (dimensions.width < 256 || dimensions.height < 256) {
        return "Logo must be at least 256×256 pixels.";
    }

    return null;
}
