import React from 'react';
import { useParams } from 'react-router-dom';
import ProductEditor from './ProductEditor';

const EditProduct = () => {
  const { id } = useParams();
  return <ProductEditor productId={id} />;
};

export default EditProduct;
