# Implementation Plan - Dynamic Homepage Banner & Product Image Auto Setup

Add a dynamic banner slider to the shop homepage and implement an automated product image setup feature.

## Proposed Changes

### Database & Models

#### [MODIFY] [shop.py](file:///c:/xampp/htdocs/ModernBazaarHO/backend/app/models/shop.py)
- Add `shop_banner` model with fields: `id`, `title`, `image`, `link`, `status`, `sort_order`, `created_at`.

#### [MODIFY] [product.py](file:///c:/xampp/htdocs/ModernBazaarHO/backend/app/models/product.py)
- Add `image1`, `image2`, `image3`, `image4` fields to the `product` model.

### Backend APIs

#### [MODIFY] [shop.py](file:///c:/xampp/htdocs/ModernBazaarHO/backend/app/routers/shop.py)
- Add `GET /shop/banners` to fetch active banners.
- Add admin endpoints for banner CRUD:
    - `GET /admin/shop/banners`
    - `POST /admin/shop/banners`
    - `PUT /admin/shop/banners/{id}`
    - `DELETE /admin/shop/banners/{id}`
- Add `POST /admin/shop/products/auto-image-setup` to automatically map images to products based on item code/name.

#### [MODIFY] [shop.py](file:///c:/xampp/htdocs/ModernBazaarHO/backend/app/schemas/shop.py)
- Add `ShopBannerBase`, `ShopBannerCreate`, `ShopBannerOut` schemas.

### Frontend Components & Pages

#### [NEW] [BannerSlider.tsx](file:///c:/xampp/htdocs/ModernBazaarHO/frontend/src/components/shop/BannerSlider.tsx)
- Implementation of the auto-sliding banner with navigation and responsive design.

#### [MODIFY] [ShopHome.tsx](file:///c:/xampp/htdocs/ModernBazaarHO/frontend/src/pages/shop/ShopHome.tsx)
- Integrate `BannerSlider` in place of the static hero section.
- Implement lazy loading for product images.

#### [MODIFY] [ProductCard.tsx](file:///c:/xampp/htdocs/ModernBazaarHO/frontend/src/components/shop/ProductCard.tsx)
- Update UI to BigBasket/Instamart style.
- Add hover/zoom effects.

#### [NEW] [ShopAdminBanners.tsx](file:///c:/xampp/htdocs/ModernBazaarHO/frontend/src/pages/admin/shop/ShopAdminBanners.tsx)
- Admin interface for managing banners.

#### [NEW] [ProductImageSetup.tsx](file:///c:/xampp/htdocs/ModernBazaarHO/frontend/src/pages/admin/shop/ProductImageSetup.tsx)
- Admin interface to trigger the auto-image setup process.

### Data & Seeding

#### [NEW] [seed_shop_data.py](file:///c:/xampp/htdocs/ModernBazaarHO/backend/seed_shop_data.py)
- Script to:
    - Insert 5-6 sample banners.
    - Insert 25-30 sample product images and link them to products via item codes.
    - Update `image1-4` for these products.

## Verification Plan

### Automated Tests
- Test API endpoints for banners using `curl` or Postman.
- Verify product image mapping logic via unit tests.

### Manual Verification
- Check banner auto-rotation in the browser.
- Verify responsive design on mobile/desktop views.
- Test admin panel CRUD for banners.
- Confirm product images are correctly displayed and zoom effect works.
