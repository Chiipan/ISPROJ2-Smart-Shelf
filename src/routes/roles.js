const express = require("express");
const { RolesRepository } = require("../repositories/rolesRepository");
const { RolesAndStaffRepository } = require("../repositories/roleandstaffRepository"); 
const authMiddleware = require("../middleware/Middleware");

const roleRouter = express.Router();
const rolesRepository = new RolesRepository();
const rolesAndStaffRepository = new RolesAndStaffRepository();
// Create new role
roleRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const roleData = req.body;
    const existingRoleName = await rolesRepository.validateExistingRole(req.body.role_name)
    if(!roleData.role_name)
    {
      res.status(400).json({error:"Role name missing!"})
    }
    roleData.created_at = roleData.created_at || new Date().toISOString();
    roleData.updated_at = roleData.updated_at || new Date().toISOString();
        roleData.is_deleted = roleData.is_deleted || 0;

    if(existingRoleName.RoleCount > 0)
    {
      res.status(400).json({error:"Role name already exists!"});
    }

    await rolesRepository.create(roleData);
    res.status(200).json({ message: "Newly created role" });
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: "Create role failed" });
  }
});

roleRouter.get("/retrieve-role-details/:id", authMiddleware, async(req,res)=>{
  try
  {
    const {id} = req.params

    
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    const role = await rolesRepository.findById(id);
    return res.status(200).json({message:"Role successfully found!", role: role})

  }
  catch(error)
  {
    return res.status(400).json({error:"Retrieve role failed."})
  }
})

// Update role by ID
roleRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const existingRoleName = await rolesRepository.validateExistingRole(req.body.role_name)
    updateData.updated_at = updateData.updated_at || new Date().toISOString();

    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }

    if(!roleData.role_name)
    {
      res.status(400).json({error:"Role name missing!"})
    }

    if(existingRoleName.RoleCount > 0)
    {
      res.status(400).json({error:"Role name already exists!"});
    }

    await rolesRepository.update(id, updateData);
    res.status(200).json({ message: "Role successfully updated!" });
  } catch (error) {
    res.status(400).json({ error: error.message || error });
  }
});

// Delete role by ID (soft delete)
roleRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await rolesRepository.softDelete(id);
    res.status(200).json({ message: "Role successfully deleted" });
  } catch (error) {
    res.status(400).json({ error: "Delete role failed" });
  }
});

// Get role by ID
roleRouter.get("/retrieve-role/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const role = await rolesRepository.findById(id);
    res.status(200).json({ roleName: role?.role_name, status: role?.is_deleted });
  } catch (error) {
    res.status(400).json({ error: "Retrieve role failed" });
  }
});


roleRouter.delete("/deny-role-access/:id", authMiddleware, async(req, res)=>{
  try
  {
    const id = req.params.id;
    if(!id)
    {
      res.status(400).json({message:"Role access deactivation failed"})
    }

    await rolesAndStaffRepository.softDelete(id)
    res.status(200).json({message:"Role access deactivated"})
  }
  catch(error)
  {
    res.status(400).json({ error: "Deactivate role access failed" });
  }
})

//Role Assignment to a user
roleRouter.post("/assign-role/", authMiddleware, async(req,res) =>
{
  try
  {
    const userId = req.user?.user_id;
    const roleId = await rolesRepository.findActiveRoleIdByName(req.body.role_name);
    const now = new Date();

    if(!userId)
    {
      res.status(400).json({message: "User Id cannot be found."})
    }

    if(!roleId)
    {
      res.status(400).json({message: "Role Id cannot be found."})
    }

    await rolesAndStaffRepository.create({role_id: roleId, user_id: userId, created_at: now, updated_at: now, is_deleted:0});
    res.status(201).json({message: "Role assignment successful"})
  }
  catch(error)
  {
    res.status(400).json({ error: "Create role access failed" });
  }

});

// Get all roles
roleRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const dataSet = await rolesRepository.findAll();
    res.status(201).json({ message: "Roles successfully retrieved", data: dataSet });
  } catch (error) {
    res.status(400).json({ message: "Data is empty" });
  }
});

// Get all active roles
roleRouter.get("/retrieve-active-roles", authMiddleware, async (req, res) => {
  try {
    const dataSet = await rolesRepository.findActive();
    res.status(201).json({ message: "Roles successfully retrieved", data: dataSet });
  } catch (error) {
    res.status(400).json({ message: "Data is empty" });
  }
});

module.exports = roleRouter;
