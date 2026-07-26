/** Permission helpers — wraps AuthContext permissions */
export function hasPermission(userPermissions = [], slug) {
  if (!slug) return true;
  return userPermissions.includes(slug);
}

export function hasAnyPermission(userPermissions = [], slugs = []) {
  return slugs.some((slug) => userPermissions.includes(slug));
}
