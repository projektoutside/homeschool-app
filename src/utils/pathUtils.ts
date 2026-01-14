/**
 * Utility functions for handling paths with GitHub Pages base URL
 * Fixes mobile browser 404 issues by ensuring consistent path normalization
 */

/**
 * Builds a path that works correctly on both desktop and mobile browsers
 * Handles BASE_URL normalization for GitHub Pages deployment
 * 
 * @param path - The path to normalize (e.g., "/Worksheets/file.html" or "Worksheets/file.html")
 * @returns Normalized path with base URL (e.g., "/homeschool-app/Worksheets/file.html" in production)
 */
export const buildAssetPath = (path: string): string => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    
    // Normalize base URL - ensure it ends with / if not root
    const normalizedBase = baseUrl === '/' ? '' : baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    
    // Remove leading slash from path if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Combine base and path
    const fullPath = `${normalizedBase}${cleanPath}`;
    
    // Ensure no double slashes (except at the beginning for absolute URLs)
    return fullPath.replace(/([^:]\/)\/+/g, '$1');
};
