export function buildSchema(theme, layout, components) {
  // Use defaults instead of throwing to be resilient to partial GPT data (B12)
  const safeTheme = {
    colors: theme?.colors || {
      primary: '#7c3aed',
      secondary: '#2563eb',
      background: '#030712',
      text: '#f9fafb'
    },
    fonts: theme?.fonts || {
      heading: 'Space Grotesk, sans-serif',
      body: 'Inter, sans-serif'
    },
    effects: theme?.effects || {},
    spacing: theme?.spacing || {}
  };

  const safeLayout = Array.isArray(layout) ? layout : [];
  const safeComponents = Array.isArray(components) ? components : [];

  const sections = safeComponents.map((component) => {
    const layoutItem = safeLayout.find((l) => l.type === component.type);
    return {
      id:      component.id,
      type:    component.type,
      order:   layoutItem?.order ?? null,
      spacing: layoutItem?.spacing ?? null,
      props:   component.props || {},
      animations: component.animations || {},
    };
  });

  sections.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

  return { theme, layout, sections };
}
