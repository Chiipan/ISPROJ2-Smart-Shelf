 function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const hasRole = allowedRoles.some(role => userRoles.includes(user.user_role.role_name));

    if (!hasRole) {
      return res.status(403).json({ message: "Forbidden: insufficient privileges"  });
    }

    next();
  };
}

module.exports = roleMiddleware;