if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelectorAll('.thumbnail'),
        };

        // Add thumbnail click handlers
        this.elements.thumbnails.forEach((thumb) => {
          thumb.addEventListener('click', this.onThumbnailClick.bind(this));
        });

        if (this.elements.viewer) {
          this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        }
      }

      onSlideChanged(event) {
        const activeMedia = event.detail.currentElement;
        if (!activeMedia) return;

        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia.classList.add('is-active');

        // Sync thumbnail active state
        const mediaId = activeMedia.dataset.mediaId;
        this.elements.thumbnails.forEach((thumb) => {
          if (thumb.dataset.mediaId === mediaId) {
            thumb.classList.add('active');
          } else {
            thumb.classList.remove('active');
          }
        });

        this.playActiveMedia(activeMedia);
      }

      onThumbnailClick(event) {
        const button = event.currentTarget;
        const targetId = button.dataset.target;
        const targetSlide = document.getElementById(`Slide-${targetId}`);

        if (targetSlide) {
          targetSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });

          // Update active thumbnail
          this.elements.thumbnails.forEach((t) => t.classList.remove('active'));
          button.classList.add('active');
        }
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }
    }
  );
}
