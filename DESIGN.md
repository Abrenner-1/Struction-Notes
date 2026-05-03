---
name: Struction Notes Modern Design System
colors:
  surface: '#fff8f6'
  surface-dim: '#edd5cb'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#ffeae0'
  surface-container-high: '#f8e4dc'
  surface-container-highest: '#f2dfd6'
  on-surface: '#231915'
  on-surface-variant: '#564339'
  inverse-surface: '#392e29'
  inverse-on-surface: '#ffede6'
  outline: '#897267'
  outline-variant: '#ddc1b4'
  surface-tint: '#9d4300'
  primary: '#783100'
  on-primary: '#ffffff'
  primary-container: '#9d4300'
  on-primary-container: '#ffceb6'
  inverse-primary: '#ffb690'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#d7dff9'
  on-secondary-container: '#5a6278'
  tertiary: '#004a74'
  on-tertiary: '#ffffff'
  tertiary-container: '#006398'
  on-tertiary-container: '#b9dcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#dae2fc'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3e465b'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#94ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#fff8f6'
  on-background: '#231915'
  surface-variant: '#f2dfd6'
  surface-main: '#fff8f6'
  surface-sidebar: '#0f172a'
  surface-editor: '#ffffff'
  on-surface-strong: '#251913'
  on-surface-muted: '#584237'
  outline-ui: '#8c7164'
  primary-hover: '#ea580c'
  accent-orange-container: '#f97316'
typography:
  display:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.2'
  h1:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.4'
  technical-label:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 1.5rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

# Design System: Struction Notes

Struction Notes is designed to be a robust, professional, and accessible interface for field operations and documentation. The goal is to provide a user experience that is clear and efficient, prioritizing data legibility and logical grouping for complex site management workflows.

## Visual Identity

The interface relies on a "neutral-first" approach, utilizing the **Slate** color family to create a clean, non-distracting canvas. Strategic use of **Orange** provides high-contrast visual cues for primary actions, status indicators, and active UI states.

The design language emphasizes:
- **Spatial Consistency**: Uniform application of padding and spacing to maintain readability.
- **Visual Hierarchy**: Clear separation of content types (notes, tasks, logs) through background-color variations and subtle border treatments.
- **Intentional Typography**: The use of Inter ensures maximum legibility for dense technical information, while JetBrains Mono provides a distinct, technical feel for system data, time trackers, and identifiers.

## Layout and UX Pattern

Struction Notes uses a standardized UI framework:
- **Sidebar-based Navigation**: Keeps the primary context stable while allowing users to deep-dive into project-specific utilities.
- **Card-based Modality**: Content groupings (notes, tasks) are encapsulated within well-defined cards to limit visual clutter.
- **Interactive Feedback**: Transitions are kept crisp and purposeful, avoiding long animations in favor of reactive, immediate UI updates.
- **Editor-Focus**: Documentation areas are treated as a distinct "focus zone," with clear toolbar separation from the canvas view.

This design system ensures that the complexity of site management is managed through simplicity of presentation, allowing the user to focus squarely on the task at hand.