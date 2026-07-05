const express = require("express");
const { CategoryRepository } = require("../repositories/categoryRepository");
const authMiddleware = require("../middleware/Middleware");

const categoryRouter = express()
const categoryRepo = new CategoryRepository();


categoryRouter.get("/", authMiddleware, async(req, res)=>{
    try
    {
        var retrieveCategories = await categoryRepo.findAll()
        return res.status(200).json({data:retrieveCategories});
    }
    catch(error)
    {
        return res.status(400).json({message:"Retrieving categories failed."})
    }
})

categoryRouter.get("/:id", authMiddleware, async(req, res)=>{
    try
    {
        const {id} = req.params

        if(!id)
        {
            return res.status(400).json({message:"Id is required"})
        }

        var retrieveCategory = await categoryRepo.findById(id);
        return res.status(200).json({message:"Category successfully found!",data:retrieveCategory});
    }
    catch(error)
    {
        return res.status(400).json({message:"Retrieving categories failed."})
    }
})

categoryRouter.post("/", authMiddleware, async(req, res)=>{
    try
    {
        const categoryData = req.body;
        const checkExistingCategory = await categoryRepo.validateExistingCategory((req.body.category_name));
        if(!categoryData.category_name)
        {
            return res.status(400).json({message:"Category is required"});
        }

        categoryData.created_at = categoryData.created_at || new Date().toISOString();
        categoryData.updated_at = categoryData.updated_at || new Date().toISOString();
        categoryData.is_deleted = 0;

        if(checkExistingCategory > 0)
        {
            return res.status(400).json({message:"Category already exists!"})
        }

        const category = await categoryRepo.create(categoryData);
        return res.status(200).json({message:"Category created successfully!", data: category})
    }
    catch(error)
    {
        return res.status(400).json({message:"Creating categories failed."})
    }
})


categoryRouter.put("/:id", authMiddleware, async(req,res)=>{
    try
    {
        const categoryData = req.body;
        const {id} = req.params

        if(!id)
        {
            return res.status(400).json({message:"Id is required"})
        }

        if(!categoryData.category_name)
        {
            return res.status(400).json({message:"Category is required"});
        }

        categoryData.updated_at = categoryData.updated_at || new Date().toISOString();
        const newCategory = await categoryRepo.update(id, categoryData);
        return res.status(200).json({message:"Category updated successfully!", data: newCategory})
    }
    catch(error)
    {
        return res.status(400).json({message:"Category successfully uodated."})
    }
})

categoryRouter.delete("/:id", authMiddleware, async(req, res)=>{
    try
    {
        const {id} = req.params

        if(!id)
        {
            return res.status(400).json({message:"Id is required"})
        }

        await categoryRepo.softDelete(id);
        return res.status(200).json({message:"Category successfully deleted!"});
    }
    catch(error)
    {
        return res.status(400).json({message:"Deleting category failed"})
    }
})
module.exports = categoryRouter;