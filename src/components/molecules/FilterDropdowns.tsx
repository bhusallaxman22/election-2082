"use client";

import React from "react";
import { Select } from "antd";
import { provinces } from "@/data/provinces";

interface FilterDropdownsProps {
  selectedProvince: string;
  selectedDistrict: string;
  onProvinceChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
}

export default function FilterDropdowns({
  selectedProvince,
  selectedDistrict,
  onProvinceChange,
  onDistrictChange,
}: FilterDropdownsProps) {
  const province = provinces.find((p) => p.id.toString() === selectedProvince);
  const districts = province?.districts || [];

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        placeholder="Select Province"
        value={selectedProvince || undefined}
        onChange={onProvinceChange}
        allowClear
        size="large"
        className="glass-select min-w-[180px]"
        options={provinces.map((p) => ({
          value: p.id.toString(),
          label: p.name,
        }))}
      />
      <Select
        placeholder="Select District"
        value={selectedDistrict || undefined}
        onChange={onDistrictChange}
        allowClear
        size="large"
        className="glass-select min-w-[180px]"
        disabled={!selectedProvince}
        options={districts.map((d) => ({
          value: d.slug,
          label: d.name,
        }))}
      />
    </div>
  );
}
