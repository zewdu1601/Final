import React, { useState } from 'react';
import { toast } from 'react-toastify';
import './User.css';

const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({
    label: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    setAddresses([...addresses, { ...form, id: Date.now() }]);
    setForm({ label: '', line1: '', city: '', state: '', pincode: '' });
    toast.success('Address added successfully!');
  };

  const handleRemove = (id) => {
    setAddresses(addresses.filter((a) => a.id !== id));
    toast.info('Address removed');
  };

  return (
    <div className="user-page container">
      <h1>My Addresses</h1>

      <div className="addresses-layout">
        {/* Form */}
        <form className="address-form" onSubmit={handleAdd}>
          <h2>Add New Address</h2>

          <div className="form-group">
            <label>Label (Home / Office)</label>
            <input
              name="label"
              value={form.label}
              onChange={handleChange}
              placeholder="Home"
              required
            />
          </div>

          <div className="form-group">
            <label>Address Line</label>
            <input
              name="line1"
              value={form.line1}
              onChange={handleChange}
              placeholder="123 Main Street"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="Addis Ababa"
                required
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="Addis Ababa"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Pincode</label>
            <input
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              placeholder="1000"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Add Address
          </button>
        </form>

        {/* List */}
        <div className="address-list">
          <h2>Saved Addresses</h2>
          {addresses.length === 0 ? (
            <p className="empty-text">No addresses saved yet.</p>
          ) : (
            addresses.map((a) => (
              <div key={a.id} className="address-card">
                <div>
                  <h4>{a.label}</h4>
                  <p>{a.line1}</p>
                  <p>{a.city}, {a.state} - {a.pincode}</p>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemove(a.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Addresses;