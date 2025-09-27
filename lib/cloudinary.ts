import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const configureCloudinary = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary environment variables');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return cloudinary;
};

export const cloudinaryInstance = configureCloudinary();

/**
 * Upload file to Cloudinary
 */
export const uploadToCloudinary = async (
  buffer: Buffer,
  options: {
    folder?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    public_id?: string;
    tags?: string[];
    transformation?: any;
  } = {}
): Promise<{
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}> => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'chatgpt-uploads',
      resource_type: options.resource_type || 'auto',
      public_id: options.public_id,
      tags: options.tags || ['chatgpt-file'],
      transformation: options.transformation,
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    ).end(buffer);
  });
};

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

/**
 * Get optimized image URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {}
): string => {
  return cloudinary.url(publicId, {
    width: options.width,
    height: options.height,
    quality: options.quality || 'auto',
    format: options.format || 'auto',
    crop: options.crop || 'fill',
  });
};

export default cloudinaryInstance;