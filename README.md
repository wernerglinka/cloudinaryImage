# CloudinaryImage
A Web Component for Lazy Loading a Cloudinary Image

The CloudinaryImage component uses progressive image loading, e.g., display a low-resolution image initially and then replace it with a high-resolution image once it becomes visible in the viewport. To achieve this, the component uses the Intersection Observer API to detect when it is in the viewport. The component will also ensure that the image maintains its aspect ratio and is styled with the appropriate CSS to prevent layout shifts.

[![npm: version][npm-badge]][npm-url]
[![license: ISC][license-badge]][license-url]

## Installation
```bash
npm install cloudinaryimage
```
## Usage
```html
<cloudinary-image
  base="https://res.cloudinary.com/<your-cloud-name>/image/upload/"
  imageid="<your-image-id>"
  alt="Your alt text"
></cloudinary-image>
```
  ## Attributes
  | Attribute | Description | Type | Default |
  | --------- | ----------- | ---- | ------- |
  | base | The base URL for your Cloudinary account | String | |
  | imageid | The image ID for your image | String | |
  | alt | The alt text for your image | String | |

  ## Styling
  The component exposes the following CSS Custom Properties for styling:
  | Property | Description | Default |
  | -------- | ----------- | ------- |
  | --image-height | The height of the image | 100% |

  The component will fill the available width. To control the height, you can set the --image-height CSS Custom Property. To cover the whole viewport for example:
  ```css
  cloudinary-image {
    --image-height: 100vh;
  }
  ```

  ## License
  [MIT](https://github.com/wernerglinka/cloudinaryImage/blob/main/LICENSE)

  ## Author
  [Werner Glinka](werner@glinka.co)

[npm-badge]: https://img.shields.io/npm/v/cloudinaryImage.svg
[npm-url]: https://www.npmjs.com/package/cloudinaryImage
[license-badge]: https://img.shields.io/github/license/wernerglinka/cloudinaryImage
[license-url]: LICENSE