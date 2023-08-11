/**
 * @name CloudinaryImage
 * @description Custom element for lazy loading images from cloudinary
 * @example <cloudinary-image base="<cloudinary-base-rl>" imageid="<cloudinary-image-id>" alt="<your alt text>"></cloudinary-image>
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

    // cache the state of the component
    this.props = {
      base: "",
      imageid: "",
      alt: ""
    };

    // updated image
    this.updateImage = async () => {
      // update aspect ratio to image wrapper
      const aspectRatio = await this.getAspectRatio(this.props.base, this.props.imageid);
      this.imageWrapper.style.aspectRatio = aspectRatio;

      // load low resolution image
      this.lowResImage.src = `${this.props.base}w_100,c_fill,g_auto,f_auto/${this.props.imageid}`;
      this.lowResImage.alt = this.props.alt;

      // images are only loaded when they are visible in the viewport
      this.observer.observe(this);
    };

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
        }
        .low-res.remove {
          transition: opacity 1s ease-in-out;
          opacity: 0;
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

  } // end constructor

  static get observedAttributes() {
    return ["base", "imageid", "alt"];
  }

  // explicitly define properties reflecting to attributes
  get base() {
    return this.props.base;
  }
  set base(value) { 
    this.props.base = value;
    this.updateImage();
  }
  get imageid() {
    return this.props.imageid;
  }
  set imageid(value) { 
    this.props.imageid = value;
    this.updateImage();
  }
  get alt() {
    return this.props.alt;
  }
  set alt(value) { 
    this.props.alt = value;
  }

  async attributeChangedCallback(property, oldValue, newValue) {
    if (!oldValue || oldValue === newValue) return;

    switch (property) {
      case "base":
        this.props.base = newValue;
        break;
      case "imageid":
        this.props.imageid = newValue;
        break;
      case "alt":
        this.props.alt = newValue;
        break;
    }
    this.updateImage();
  }

  connectedCallback() {
    this.props.base = this.getAttribute("base");
    this.props.imageid = this.getAttribute("imageid");
    this.props.alt = this.getAttribute("alt");

    this.updateImage();
  }

  disconnectedCallback() {
    this.observer.unobserve(this);
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
  try {
    // get the image properties from cloudinary
    // ref: https://cloudinary.com/documentation/image_transformation_reference#fl_getinfo
    const response = await fetch(`${base}fl_getinfo/${imageid}`, {
      headers: { Accept: "application/json" },
    });

    // Check if the response status is not OK (i.e., not a 2xx status)
    if (!response.ok) {
      throw new Error(`Failed to fetch aspect ratio. Status: ${response.status}`);
    }

    const data = await response.json();

    // Ensure the expected properties exist in the returned data
    if (!data.input || typeof data.input.width !== "number" || typeof data.input.height !== "number") {
      throw new Error("Unexpected response format from Cloudinary");
    }

    // image dimensions
    const imageWidth = data.input.width;
    const imageHeight = data.input.height;

    if (imageHeight === 0) {
      throw new Error("Image height is 0, cannot compute aspect ratio");
    }

    const aspectRatio = (Math.round((imageWidth / imageHeight) * 100) / 100).toFixed(3);
    return aspectRatio;

  } catch (error) {
    console.error(`Error getting aspect ratio: ${error.message}`);
    return "1"; // Default aspect ratio (1:1) if there's an error.
  }
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

    // disconnect observer once image is loaded
    this.observer.unobserve(this);

    const imageParams = this.getImageTransformations();
    // high res image source
    this.highResImage.src = `${this.props.base}${imageParams}/${this.props.imageid}`;
    this.highResImage.alt = this.props.alt;

    // once the hi-res image has been loaded, fade-out the low-res image and remove it
    this.highResImage.onload = () => {
      this.lowResImage.classList.add("remove");
      
      this.lowResImage.addEventListener("transitionend", () => {
        this.lowResImage.remove();
      });
        
    };
  };
}

// register component
customElements.define("cloudinary-image", CloudinaryImage);
