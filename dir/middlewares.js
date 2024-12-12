import express from 'express';

const Middlewares = (api) => {
  api.use(express.json({ limit: '200mb' }));
};

export default Middlewares;
