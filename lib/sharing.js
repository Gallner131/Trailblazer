// Sharing module: canvas image generation and Web Share API
window.AppSharing = {
  /**
   * Generate a canvas image of a segment with metadata
   * @param {Object} segment - Segment data (id, name, length_m, climb_m, geom)
   * @param {string} userTime - User's time (e.g., "5:32")
   * @param {number} rank - User's rank on leaderboard (e.g., 1)
   * @param {string} date - Date string (e.g., "2026-08-12")
   * @returns {Promise<string>} Data URL of canvas image
   */
  async generateSegmentImage(segment, userTime, rank, date) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#FF4B12');
      gradient.addColorStop(1, '#E63B00');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // White content area
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 100, canvas.width, 600);

      // Segment name (top, on orange)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px "Inter Tight", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this._truncateText(segment.name, 25), canvas.width / 2, 70);

      // Miniature segment shape visualization
      this._drawSegmentShape(ctx, segment.geom, 80, 200, 450, 200);

      // Segment details (white area)
      ctx.fillStyle = '#0E1116';
      ctx.font = 'bold 18px "Inter Tight", sans-serif';
      ctx.textAlign = 'center';

      let yPos = 350;
      // Distance & Climb
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = '#6E7681';
      ctx.fillText(
        `${(segment.length_m / 1000).toFixed(1)} km • ${segment.climb_m || 0} m climb`,
        canvas.width / 2,
        yPos
      );

      yPos += 50;
      // Time & Rank
      ctx.font = 'bold 24px "Inter Tight", sans-serif';
      ctx.fillStyle = '#FF4B12';
      ctx.fillText(userTime, canvas.width / 2, yPos);

      yPos += 35;
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = '#6E7681';
      ctx.fillText(
        rank === 1 ? '🥇 First place!' : `#${rank} on today's board`,
        canvas.width / 2,
        yPos
      );

      yPos += 50;
      // Date
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#9AA1AC';
      const displayDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      ctx.fillText(`Claimed ${displayDate}`, canvas.width / 2, yPos);

      // Trailblazer footer
      yPos = canvas.height - 40;
      ctx.font = 'bold 14px "Inter Tight", sans-serif';
      ctx.fillStyle = '#FF4B12';
      ctx.fillText('Trailblazer', canvas.width / 2, yPos);

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#9AA1AC';
      ctx.fillText('Run local segments, claim your map', canvas.width / 2, yPos + 25);

      resolve(canvas.toDataURL('image/png'));
    });
  },

  /**
   * Draw a simplified segment shape on the canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array} geom - [[lat, lng], ...]
   * @param {number} x - Canvas x position
   * @param {number} y - Canvas y position
   * @param {number} width - Bounding box width
   * @param {number} height - Bounding box height
   */
  _drawSegmentShape(ctx, geom, x, y, width, height) {
    if (!geom || geom.length < 2) return;

    // Find bounds
    let minLat = geom[0][0], maxLat = geom[0][0];
    let minLng = geom[0][1], maxLng = geom[0][1];
    geom.forEach(([lat, lng]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const padding = 20;

    // Draw background
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#E7E9ED';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Draw segment path
    ctx.strokeStyle = '#FF4B12';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw start point (circle)
    const startLat = geom[0][0];
    const startLng = geom[0][1];
    const startX = x + padding + ((startLng - minLng) / lngRange) * (width - 2 * padding);
    const startY = y + padding + ((maxLat - startLat) / latRange) * (height - 2 * padding);
    ctx.fillStyle = '#FF4B12';
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw path
    ctx.beginPath();
    geom.forEach((coord, idx) => {
      const [lat, lng] = coord;
      const px = x + padding + ((lng - minLng) / lngRange) * (width - 2 * padding);
      const py = y + padding + ((maxLat - lat) / latRange) * (height - 2 * padding);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw end point (triangle)
    const endLat = geom[geom.length - 1][0];
    const endLng = geom[geom.length - 1][1];
    const endX = x + padding + ((endLng - minLng) / lngRange) * (width - 2 * padding);
    const endY = y + padding + ((maxLat - endLat) / latRange) * (height - 2 * padding);
    ctx.fillStyle = '#FF4B12';
    ctx.beginPath();
    ctx.moveTo(endX, endY - 5);
    ctx.lineTo(endX - 4, endY + 4);
    ctx.lineTo(endX + 4, endY + 4);
    ctx.closePath();
    ctx.fill();
  },

  /**
   * Truncate text to fit within character limit
   */
  _truncateText(text, maxChars) {
    return text.length > maxChars ? text.substring(0, maxChars) + '…' : text;
  },

  /**
   * Share image and link using Web Share API or clipboard
   * @param {string} imageDataUrl - Canvas image data URL
   * @param {string} segmentName - Segment name for share text
   * @param {string} userTime - User's time for share text
   * @param {number} segmentId - Segment ID for share link
   * @returns {Promise<boolean>} True if successful
   */
  async shareSegment(imageDataUrl, segmentName, userTime, segmentId) {
    try {
      // Try Web Share API first
      if (navigator.share) {
        // Convert data URL to blob
        const blob = await this._dataUrlToBlob(imageDataUrl);
        const file = new File([blob], 'segment.png', { type: 'image/png' });

        const shareLink = `${window.location.origin}/public-segment.html?segment_id=${segmentId}`;
        const shareText = `I ran ${segmentName} in ${userTime} on Trailblazer!`;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Trailblazer',
            text: shareText,
            url: shareLink
          });
          return true;
        } else {
          // Share without file
          await navigator.share({
            title: 'Trailblazer',
            text: shareText,
            url: shareLink
          });
          return true;
        }
      } else {
        // Fallback: copy link to clipboard
        const shareLink = `${window.location.origin}/public-segment.html?segment_id=${segmentId}`;
        await navigator.clipboard.writeText(shareLink);
        return true;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // User cancelled
        return false;
      }
      console.error('Share failed:', error);
      throw error;
    }
  },

  /**
   * Convert data URL to Blob
   */
  _dataUrlToBlob(dataUrl) {
    return new Promise((resolve) => {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      resolve(new Blob([u8arr], { type: mime }));
    });
  },

  /**
   * Copy a URL to clipboard and show feedback
   */
  async copyLinkToClipboard(segmentId, onSuccess) {
    try {
      const shareLink = `${window.location.origin}/public-segment.html?segment_id=${segmentId}`;
      await navigator.clipboard.writeText(shareLink);
      if (onSuccess) onSuccess();
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }
};
