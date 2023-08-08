/**
 * @name CloudinaryImage
 * @description Custom element for lazy loading images from cloudinary
 * @example <cloudinary-image base="https://res.cloudinary.com/your-cloud-name/image/upload/" imageid="your-image-id" alt="your alt text"></cloudinary-image>
 * @param {string} base - cloudinary base url
 * @param {string} imageid - cloudinary image id
 * @param {string} alt - image alt text
 *
 * - Load a low resolution image for fast loading and then replace it with a high resolution image
 *   once it has been loaded.
 * - To prevent layout shift, the image is wrapped in a figure element with an aspect ratio
 *   matching the image. The aspect ratio is calculated from the image width and height which is
 *   fetched from cloudinary.
 * - The figure element is styled with overflow: hidden and the image is styled with
 *   object-fit: cover. This will ensure that the image will fill the figure element
 *   without stretching or squashing the image.
 */
class CloudinaryImage extends HTMLElement {
  constructor() {
    super();

    // Create an observer instance and load a high resolution image when the component is visible
    this.observer = new IntersectionObserver(this.loadImage.bind(this));

    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>
        :host {
          --image-height: auto;
        }
        figure {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          margin: 0;
          transition: all 0.3s ease-in-out;
        }
        img {
          display: block;
          width: 100%;
          height: var(--image-height);
          object-fit: cover;
        }
        .low-res {
          filter: blur(10px);
          transition: opacity 0.4s ease-in-out;
        }
        .high-res {
          display: block;
          position: absolute;
          z-index: -1;
          top: 0;
          left: 0;
        }
      </style>
      <figure>  
        <img class="low-res" src="" alt="">
        <img class="high-res" src="" alt="">
      </figure>
    `;
    this.imageWrapper = this.shadowRoot.querySelector("figure");
    this.lowResImage = this.shadowRoot.querySelector(".low-res");
    this.highResImage = this.shadowRoot.querySelector(".high-res");

  }

  static get observedAttributes() {
    return ["base", "imageid", "alt"];
  }

  // explicitly define properties reflecting to attributes
  get base() {
    return this.getAttribute('base');
  }
  set base(value) { 
    if (value) {
      this.setAttribute('base', value); 
    } else {
      this.removeAttribute('base');
    }
  }
  get imageid() {
    return this.getAttribute('imageid');
  }
  set imageid(value) { 
    if (value) {
      this.setAttribute('imageid', value); 
    } else {
      this.removeAttribute('imageid');
    }
  }
  get alt() {
    return this.getAttribute('alt');
  }
  set alt(value) { 
    if (value) {
      this.setAttribute('alt', value); 
    } else {
      this.removeAttribute('alt');
    }
  }

  async attributeChangedCallback(property, oldValue, newValue) {
    if (!oldValue || oldValue === newValue) return;

    const { base, imageid, alt } = this.getAttributes();
    const imageParams = this.getImageTransformations();

    switch (property) {
      case "base":
      case "imageid":
        // change image source
        this.highResImage.src = `${base}${imageParams}/${imageid}`;

        // change the image wrapper aspect ratio
        const aspectRatio = await this.getAspectRatio(base, imageid);
        this.imageWrapper.style.aspectRatio = aspectRatio;

        break;

      case "alt":
        // change alt text
        this.highResImage.alt = alt;
        break;
    }
  }

  async connectedCallback() {
    const self = this;
    const { base, imageid, alt } = this.getAttributes();

    // add aspect ratio to image wrapper
    const aspectRatio = await this.getAspectRatio(base, imageid);
    this.imageWrapper.style.aspectRatio = aspectRatio;

    // load low resolution image
    this.lowResImage.src = `${base}w_100,c_fill,g_auto,f_auto/${imageid}`;
    this.lowResImage.alt = alt;

    // images are only loaded when they are visible in the viewport
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.observer.unobserve(this);
  }

  /**
   * Get the component attributes
   * @returns {object} component attributes
   * @private
   * @example const attributes = getAttributes();
   */
  getAttributes() {
    const base = this.getAttribute("base");
    const imageid = this.getAttribute("imageid");
    const alt = this.getAttribute("alt");

    return { base, imageid, alt };
  }

  /**
   * Get the image transformation parameters
   * @returns {string} image transformation parameters
   * @private
   * @example const imageParams = getImageTransformations();
   * @see https://cloudinary.com/documentation/image_transformations
   */
  getImageTransformations() {
    // get width of figure parent element
    // Note: do this after shadow.append otherwise offsetWidth will be 0
    const parentWidth = this.offsetWidth;
    // get device pixel ratio
    const pixelRatio = window.devicePixelRatio || 1.0;
    // build transformation parameters for the cloudinary image url
    const imageParams = `w_${100 * Math.round((parentWidth * pixelRatio) / 100)},f_auto`;

    return imageParams;
  }

  /**
   * Get the aspect ratio of the image
   * @returns {number} aspect ratio
   * @private
   * @async
   * @example const aspectRatio = await getAspectRatio();
   */
  async getAspectRatio(base, imageid) {
    // get the image properties from cloudinary
    // ref: https://cloudinary.com/documentation/image_transformation_reference#fl_getinfo
    const response = await fetch(`${base}fl_getinfo/${imageid}`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    // image dimensions
    const imageWidth = data.input.width;
    const imageHeight = data.input.height;
    const aspectRatio = (Math.round((imageWidth / imageHeight) * 100) / 100).toFixed(3);

    return aspectRatio;
  }

  /**
   * Load the initial high-res image
   * create high resolution image
   * @param {Array} entries
   * @param {Object} observer
   * @returns {void}
   */
  loadImage = (entries, observer) => {
    if (!entries[0].isIntersecting) return;

    // disconnect observer once image is loaded// take this image of the observe list
    this.observer.unobserve(this);

    const { base, imageid, alt } = this.getAttributes();
    const imageParams = this.getImageTransformations();
    // high res image source
    this.highResImage.src = `${base}${imageParams}/${imageid}`;
    this.highResImage.alt = alt;

    // once the hi-res image has been loaded, fade-out the low-res image and remove it
    this.highResImage.onload = () => {
      let opacity = 1;
      let fadeOut = setInterval(() => {
        if (opacity <= 0) {
          clearInterval(fadeOut);
          // remove low-res image after transition ends
          this.lowResImage.addEventListener("transitionend", () => {
            this.lowResImage.remove();
          });
        }
        this.lowResImage.style.opacity = opacity;
        opacity -= 0.1;
      }, 100);
    };
  };
}

// register component
customElements.define("cloudinary-image", CloudinaryImage);
