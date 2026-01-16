/**
 * Utility functions for handling file downloads
 */

/**
 * Downloads a file from a URL with a specific filename
 * 
 * @param url - The URL of the file to download
 * @param filename - The desired name for the downloaded file
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download failed:', error);
        // Fallback: open in new tab if blob download fails
        window.open(url, '_blank');
    }
};
