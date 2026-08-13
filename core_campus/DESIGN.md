---
name: Core Campus
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
---

## Brand & Style

The design system is built on a foundation of **Minimalism** and **Corporate Modernism**. It is tailored for campus administrators who require a high-density information environment that remains calm and focused. The aesthetic prioritizes clarity and utility over decorative elements, using generous whitespace to reduce cognitive load during complex networking tasks.

The visual language communicates reliability and precision. By utilizing a "Paper on Slate" approach—where crisp white interactive modules sit atop deep, structured backgrounds—the UI creates a natural hierarchy that directs the user’s eye toward active tasks and data visualizations.

## Colors

The palette is anchored by **Deep Slate (#0F172A)** for primary navigation and structural surfaces, providing a grounded, professional atmosphere. 

- **Primary Action (Admin Blue):** #2563EB is used exclusively for primary buttons, active states, and critical paths.
- **Surface Strategy:** Backgrounds use a very light neutral gray (#F8FAFC), while all functional "work containers" and cards use a pure white (#FFFFFF) to maximize contrast for legibility.
- **Accents:** Tertiary slate-gray is reserved for secondary information and iconography, ensuring the UI doesn't feel overly "heavy."

## Typography

This design system uses **Inter** for all roles to ensure maximum readability and a systematic, utilitarian feel. 

- **Hierarchy:** We use a strict weight-based hierarchy. Headlines use Semi-Bold (600) to stand out against the clean background.
- **Labels:** Small labels use Medium (500) weight with a slight letter-spacing increase to maintain legibility in dense data tables or small form captions.
- **Mobile Scaling:** For mobile viewports, `display-lg` should scale down to 28px to prevent excessive line-wrapping while maintaining its visual weight.

## Layout & Spacing

The design system employs a **Fixed Grid** philosophy for dashboard content to maintain structured alignment of data widgets.

- **Grid:** A 12-column grid for desktop with 24px (1.5rem) gutters.
- **Rhythm:** All margins and paddings must be multiples of the 4px base unit. 
- **Authentication Layout:** Auth cards are centered both vertically and horizontally on the screen, limited to a max-width of 440px to ensure focus.
- **Responsive Behavior:** 
  - **Desktop (1280px+):** Sidebar is fixed; content occupies the remaining width with large 40px (2.5rem) side margins.
  - **Tablet (768px - 1279px):** Sidebar collapses to icons; margins reduce to 24px.
  - **Mobile (<767px):** Single column flow; margins reduce to 16px.

## Elevation & Depth

This design system uses a **Tonal Layering** approach combined with **Low-contrast outlines** to define depth. We avoid heavy shadows to maintain a clean, professional aesthetic.

1.  **Level 0 (Floor):** The base background uses the Neutral Slate (#F8FAFC).
2.  **Level 1 (Cards/Content):** Pure white surfaces with a 1px solid border (#E2E8F0). No shadow.
3.  **Level 2 (Dropdowns/Modals):** Pure white surfaces with a 1px border and a very subtle, highly diffused shadow (0px 10px 15px -3px rgba(0, 0, 0, 0.05)) to suggest interaction.
4.  **Level 3 (Navigation):** The primary sidebar is treated as a high-contrast dark surface (Deep Slate) to distinguish global navigation from the workspace.

## Shapes

The design system uses a **Soft** shape language. This provides a modern, approachable feel while remaining structured enough for a professional admin tool.

- **Standard Elements:** Buttons, input fields, and small cards use a 0.25rem (4px) radius.
- **Large Containers:** Dashboard widgets and authentication cards use a 0.5rem (8px) radius.
- **Status Indicators:** Chips and badges use a fully rounded (pill) shape to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Admin Blue background, white text. No gradient. 
- **Secondary:** White background with #E2E8F0 border, Slate text.
- **States:** Hover states should darken the background color by 10%. Focus states require a 2px offset ring in Admin Blue.

### Input Fields
- **Labeling:** Always use top-aligned, `label-md` typography in Tertiary Slate (#64748B).
- **Structure:** 1px border (#E2E8F0). On focus, the border changes to Admin Blue with a subtle light-blue inner glow.
- **Validation:** Error states use a crisp red (#EF4444) for both the border and a small helper text below the field.

### Authentication Cards
- Centered on the viewport.
- 32px (2rem) internal padding.
- Heavy focus on the "Primary Action" button, which should span the full width of the card.

### Data Tables
- Header cells use `label-md` with a light gray background (#F1F5F9).
- Row borders are horizontal only (1px solid #E2E8F0).
- Hover effect on rows uses a very subtle tint (#F8FAFC) to aid scanning.

### Status Chips
- Used for network health (Online, Offline, Pending).
- Small, uppercase text (`label-sm`) with a light background tint of the status color (e.g., light green background for "Online" status).