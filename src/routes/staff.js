const express = require("express");
const authMiddleware = require("../middleware/Middleware");
const { StaffRepository } = require("../repositories/staffRepository");

const staffRouter = express.Router();
const staffRepo = new StaffRepository();

// Get all staff
staffRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const retrieveStaffRepository = await staffRepo.findAll();
    res.status(200).json({ data: retrieveStaffRepository });
  } catch (error) {
    res.status(400).json({ error: "Retrieve staff failed: " + (error.message || error) });
  }
});


staffRouter.delete("/:id", authMiddleware, async(req,res)=>{
  try
  {
    const {id} = req.params;

    if(!id)
    {
      return res.status(400).json({message:"Id is required"})
    }

    await staffRepo.softDelete(id);
    res.status(200).json({message:"Staff successfully deleted"});
  }
  catch(error)
  {
    res.status(400).json({error: "Deleted staff failed: "+ (error.message|| error)})
  }
})

staffRouter.put("/:id", authMiddleware, async(req,res)=>{
  try
  {
    const {id} = req.params;
    const staffData = req.body
    staffData.updated_at = staffData.updated_at || new Date().toISOString();

    if(!id)
    {
      return res.status(400).json({message:"Id is required"})
    }

    if(!staffData.first_name| !staffData.last_name | !staffData.role)
    {
      res.status(400).json({message: "Staff first name, last name, and role are required"})
    }

    await staffRepo.update(id, staffData);
    return res.status(200).json({message:"Staff successfully updated!"})
  }
  catch(error)
  {
    res.status(400).json({error: "Update user failed: "+ (error.message||error)})
  }
})

staffRouter.get("/:id", authMiddleware, async(req,res)=>{
  try
  {
    const {id} = req.params;
    const staff = await staffRepo.findById(id);
    res.status(200).json({staff: staff});
  }
  catch(error)
  {
    res.status(400).json({error:"Failed to retrieve user information"})
  }
});


// Create staff (implementation can be added)
staffRouter.post("/create-staff", authMiddleware, async (req, res) => {
  try {
    // You can implement staff creation here, e.g.,
    const staffData = req.body;

    staffData.is_deleted = staffData.is_deleted || true;
    staffData.created_at = staffData.created_at || new Date().toISOString();
    staffData.updated_at = staffData.updated_at || new Date().toISOString();

    if(!staffData.first_name| !staffData.last_name | !staffData.role)
    {
      res.status(400).json({message: "Staff first name, last name, and role are required"})
    }

    await staffRepo.create(staffData);
    res.status(200).json({ message: "Staff created" });
  } catch (error) {
    res.status(400).json({ error: "Create staff failed: " + (error.message || error) });
  }
});

module.exports = staffRouter;
