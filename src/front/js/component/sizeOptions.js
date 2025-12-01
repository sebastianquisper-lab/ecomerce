import React from "react";

const SizeOptions = ({ sizes, selectedSize, onSizeSelect }) => {
  return (
    <div className="d-flex mb-3">
      {sizes.map((size) => (
        <p
          key={size.id}
          className={`size-text ${selectedSize?.id === size.id ? "active" : ""}`}
          onClick={() => onSizeSelect(size)}
        >
          {size.name}
        </p>
      ))}
    </div>
  );
};

export default SizeOptions;
