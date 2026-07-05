const express = require("express");
const { DiscountRepository } = require("../repositories/discountRepository");
const authMiddleware = require("../middleware/Middleware");

const discountRouter = express()
const discountRepo = new DiscountRepository();

discountRouter.get("/", authMiddleware, async(req, res)=>{
    try
    {
        var discounts = await discountRepo.findAll();
        return res.status(200).json({message:"All discounts retrieved successfully!",data:discounts})
    }
    catch(error)
    {
        return res.status(400).json({message:"Discount not retrieved"})
    }
});


discountRouter.get("/retrieve-discount-details/:id", authMiddleware, async(req,res)=>{
  try
  {
    const {id} = req.params

    
    if (!id) {
      return res.status(400).json({ error: "ID is required" });
    }
    const discount = await discountRepo.findById(id);
    return res.status(200).json({message:"Discount successfully found!", discount: discount})

  }
  catch(error)
  {
    return res.status(400).json({error:"Retrieve discount failed."})
  }
})

discountRouter.post("/", authMiddleware, async(req,res)=>{
    try
    {
        const discountBody = req.body;
        const checkDiscount = await discountRepo.validateExistingDiscountType(req.body.discount_type);

        discountBody.created_at = discountBody.created_at || new Date().toISOString();
        discountBody.updated_at = discountBody.updated_at || new Date().toISOString();
        discountBody.is_deleted = 0;

        if(checkDiscount.DiscountCount > 0)
        {
            return res.status(400).json({error:"Discount type already existed!"})
        }

        await discountRepo.create(req.body);
        return res.status(200).json({message:"Discount successfully created!"})
    }
    catch(error)
    {
        return res.status(400).json({message:"Adding discount failed"})
    }
})


discountRouter.put("/:id", authMiddleware, async(req,res)=>{
    try
    {
        const {id} = req.params;
        const checkDiscount = await discountRepo.validateExistingDiscountType(req.body.discount_type);
        const discountBody = req.body;
        discountBody.updated_at = discountBody.updated_at || new Date().toISOString();
        if(!id)
        {
            return res.status(400).json({error: "ID is required"})
        }

        if(checkDiscount.DiscountCount > 0)
        {
            return res.status(400).json({error:"Discount type already existed!"})
        }

        await discountRepo.update(id, req.body);
        return res.status(200).json({message:"Discount changed successfully!"})
    }
    catch(error)
    {
        console.log(error)
        return res.status(400).json({error:"Update discount failed"})
    }
})


discountRouter.delete("/:id", authMiddleware, async(req, res)=>{
    try
    {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "ID is required" });
        }

        await discountRepo.softDelete(id);
        return res.status(200).json({message:"Discount successfully deactivated!"})
    }
    catch(error)
    {
        return res.status(400).json({error:"Deleting discount failed"})
    }
})
module.exports = discountRouter;