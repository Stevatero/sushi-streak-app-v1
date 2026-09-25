const { applyVariant, DEV_ONLY_MODULES } = require('../configure-build-variant');

describe('configure-build-variant', () => {
  const pkg = { name: 'app', expo: { autolinking: { exclude: ['altro-modulo'] } } };

  it.each(['production', 'preview'])('esclude gli strumenti di sviluppo nella variante %s', (variant) => {
    const result = applyVariant(pkg, variant);
    expect(result.expo.autolinking.exclude).toEqual(expect.arrayContaining(['altro-modulo', ...DEV_ONLY_MODULES]));
  });

  it('non modifica la build di sviluppo', () => {
    expect(applyVariant(pkg, 'development')).toBe(pkg);
  });

  it('è idempotente', () => {
    const once = applyVariant(pkg, 'production');
    expect(applyVariant(once, 'production').expo.autolinking.exclude).toHaveLength(
      once.expo.autolinking.exclude.length
    );
  });
});
