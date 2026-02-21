import React, { useState, useEffect } from 'react';
import { PaymentStatus, PaymentMode } from '../types';
import { getInstallmentStatus } from '../services/logicService';
import { sendPaymentLink, sendReceipt } from '../services/whatsappService';
import db from '../db';

const Collections: React.FC = () => {

  // 🔥 Refresh trigger for DB updates
  const [refresh, setRefresh] = useState(0);

  // 🔥 Listen for DB changes (sync / dirty)
  useEffect(() => {
    db.setDirtyListener(() => {
      setRefresh(prev => prev + 1);
    });
  }, []);

  // 🔥 Re-evaluate DB data whenever refresh changes
  const chits = db.getChits();
  const [selectedChit, setSelectedChit] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [showCollectDialog, setShowCollectDialog] = useState<any>(null);

  // 🔥 Ensure selectedChit updates when chits load from cloud
  useEffect(() => {
    if (chits.length > 0 && !selectedChit) {
      setSelectedChit(chits[0].chitGroupId);
    }
  }, [chits, selectedChit]);

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);
  const memberships = db.getMemberships().filter(m => m.chitGroupId === selectedChit);
  const members = db.getMembers();

  const handleCollect = (formData: any) => {
    const { memberId, amount, mode, ref } = formData;
    const member = members.find(m => m.memberId === memberId);

    db.addPayment({
      paymentId: `pay_${Date.now()}`,
      chitGroupId: selectedChit,
      memberId,
      monthNo: selectedMonth,
      paidAmount: Number(amount),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: mode as PaymentMode,
      referenceNo: ref,
      collectedBy: 'admin'
    });

    if (member && currentChit) {
      sendReceipt(
        selectedChit,
        memberId,
        member.mobile,
        member.name,
        currentChit.name,
        selectedMonth,
        Number(amount)
      );
    }

    setShowCollectDialog(null);
  };

  return (
    <div className="space-y-6 animate-in">

      {/* Filters */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row items-stretch md:items-end gap-4 mx-0">

        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">
            Select Group
          </label>
          <select
            value={selectedChit}
            onChange={(e) => setSelectedChit(e.target.value)}
            className="border ms-border p-2 rounded text-sm outline-none w-full bg-white"
          >
            {chits.map(c => (
              <option key={c.chitGroupId} value={c.chitGroupId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col w-full md:w-32">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border ms-border p-2 rounded text-sm outline-none w-full bg-white"
          >
            {Array.from(
              { length: currentChit?.totalMonths || 0 },
              (_, i) => i + 1
            ).map(m => (
              <option key={m} value={m}>
                M{m}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* 🔥 Your existing table + mobile UI can remain exactly same below */}

    </div>
  );
};

export default Collections;
