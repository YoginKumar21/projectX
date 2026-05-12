---
name: Luminous Minimalist
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
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#8127cf'
  on-secondary: '#ffffff'
  secondary-container: '#9c48ea'
  on-secondary-container: '#fffbff'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Poppins
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  h3:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  sidebar_width: 260px
  sidebar_collapsed: 80px
  navbar_height: 72px
  gutter: 24px
  container_max: 1440px
---

## Brand & Style
The design system for SyncPad centers on a "Digital Ethereal" aesthetic. It balances the high-utility requirements of a SaaS platform with a soft, futuristic atmosphere. The brand personality is efficient yet calm, aimed at professionals who value focus and clarity.

The visual style leverages **Glassmorphism** for depth and **Minimalism** for layout. By combining translucent layers with vibrant gradients, the UI feels lightweight and breathable. Interactions should feel fluid and organic, utilizing subtle motion to guide the user's eye across the interface without causing cognitive fatigue.

## Colors
The palette is rooted in deep indigos and crisp slate neutrals. The primary Indigo/Blue gradient is used for high-emphasis actions and progress indicators. The Purple/Blue accent gradient is reserved for highlighting active states, premium features, or notifications.

In light mode, surfaces use off-white slates to reduce glare. In dark mode, the background shifts to a deep navy (#0F172A), allowing glass elements to pop with a subtle inner glow. Gradients should be applied sparingly to maintain a clean, professional look.

## Typography
This design system utilizes a dual-font approach. **Poppins** provides a geometric, friendly, and modern feel for headings, reinforcing the futuristic brand identity. **Inter** is used for all body text, labels, and data-heavy interfaces to ensure maximum legibility and a systematic, clean feel.

Maintain generous line heights for body text to support the minimal aesthetic. Use font weight to establish hierarchy rather than excessive color changes.

## Layout & Spacing
The layout follows a structured, desktop-first approach with a collapsible left sidebar and a fixed top navbar. Content is contained within a fluid grid that transitions to a fixed container at large breakpoints.

Spacing follows an 8px rhythmic scale. Use large 24px gutters to prevent the UI from feeling cramped. The sidebar should utilize a subtle backdrop-blur (12px) when overlaid on content, though it typically pushes the main content area to maintain clarity.

## Elevation & Depth
Depth is created through **Glassmorphism** and **Ambient Shadows**. Instead of heavy, dark shadows, use soft, diffused blurs with a slight indigo tint (e.g., `rgba(99, 102, 241, 0.08)`) to lift cards off the background.

Surfaces use backdrop filters (`blur(16px)`) combined with a 1px semi-transparent border to simulate thin glass. Stacked elements should use "Tonal Layers"—each successive layer (e.g., a modal on top of a card) becomes slightly lighter and more opaque to signify its position in the Z-axis.

## Shapes
The shape language is defined by oversized radii. Elements use "xl" roundedness as the standard, creating a soft, approachable feel that contrasts with the technical nature of a SaaS app. Containers, buttons, and input fields all share this consistent curvature. Small chips and tags may use fully pill-shaped corners to distinguish them from structural components.

## Components
- **Buttons**: Primary buttons use the Indigo gradient with a subtle lift on hover. Secondary buttons use a glass effect with a primary-colored border.
- **Cards**: Feature a white (or dark navy) semi-transparent fill (80% opacity), a 16px backdrop blur, and a 1px gradient border that catches the light.
- **Inputs**: Clean, borderless appearances with a soft gray background fill. On focus, the background turns white (or deep navy) and gains a subtle primary-colored glow.
- **Sidebar Items**: Hover states should use a "ghost" fill with a soft purple accent line on the left.
- **Glass Chips**: Translucent backgrounds with high-contrast text, used for status indicators.
- **Search Bar**: A prominent glassmorphic element in the top navbar, utilizing a subtle inner shadow to imply depth.