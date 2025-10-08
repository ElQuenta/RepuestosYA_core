import { Request, Response } from 'express';

import * as DetailsService from '../services/productDetailsService';

export const create_car_model = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const newCarModel = await DetailsService.create_car_model(name);
    res.status(201).json(newCarModel);
  } catch (error) {
    console.error('Error creating car model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const create_brand = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const newBrand = await DetailsService.create_brand(name);
    res.status(201).json(newBrand);
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
export const fetch_car_models = async (req: Request, res: Response) => {
  try {
    const carModels = await DetailsService.fetch_car_models();
    res.json(carModels);
  } catch (error) {
    console.error('Error fetching car models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const fetch_brands = async (req: Request, res: Response) => {
  try {
    const brands = await DetailsService.fetch_brands();
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const remove_car_model = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DetailsService.remove_car_model(Number(id));
    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing car model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const remove_brand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DetailsService.remove_brand(Number(id));
    res.sendStatus(204);
  } catch (error) {
    console.error('Error removing brand:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
