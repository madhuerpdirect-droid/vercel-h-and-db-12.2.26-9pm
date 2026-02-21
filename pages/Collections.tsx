import React, { useState, useEffect } from 'react';
import { PaymentMode } from '../types';
import { sendReceipt } from '../services/whatsappService';
import db from '../db';

const Collections: React.FC = () => {

  /* ================= STATE ================= */

  const [chits, setChits] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);

  const [selectedChit, setSelectedChit] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(1);

  /* ================= LOAD DATA ================= */

  const loadData = () => {
    setChits([...db.getChits()]);
    setMembers([...db.getMembers()]);
    setMemberships([...db.getMemberships()]);
  };

  useEffect(() => {
    loadData();

    db.setDirtyListener(() => loadData());

    db.setSyncListener((syncing) => {
      if (!syncing) loadData();
    });

  }, []);

  /* ================= ENSURE VALID CHIT ================= */

  useEffect(() => {
    if (chits.length > 0) {
      const exists = chits.some(c => c.chitGroupId === selectedChit);

      if (!selectedChit || !exists) {
        setSelectedChit(chits[0].chitGroupId);
      }
    }
  }, [chits, selectedChit]);

  /* ================= DERIVED ================= */

  const currentChit = chits.find(c => c.chitGroupId === selectedChit);

  const filteredMemberships = memberships.filter(
    m => m.chitGroupId === selectedChit
  );

  /* ================= PAYMENT ================= */

  const handleCollect = (memberId: string) => {

    db.addPayment({
      paymentId: `pay_${Date.now()}`,
      chitGroupId: selectedChit,
      memberId,
      monthNo: selectedMonth,
      paidAmount: 0, // adjust if needed
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: PaymentMode.CASH,
      referenceNo: '',
      collectedBy: 'admin'
    });

    const member = members.find(m => m.memberId === memberId);

    if (member && currentChit) {
      sendReceipt(
        selectedChit,
        memberId,
        member.mobile,
        member.name,
        currentChit.name,
        selectedMonth,
        0
      );
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6 animate-in">

      {/* Filters */}
      <div className="ms-bg-card p-4 rounded border ms-border ms-shadow flex flex-col md:flex-row gap-4">

        {/* Group */}
        <div className="flex flex-col flex-1">
          <label className="text-xs font-bold text-gray-400 uppercase mb-1">
            Select Group
          </label>
          <select
            value={selectedChit}
            onChange={(e) => setSelectedChit(e.target.value)}
            className="border p-2 rounded text-sm bg-white"
          >
            {chits.map(c => (
              <option key={c.chitGroupId} value={c.chitGroupId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div className="flex flex-col w-full md:w-32">
          <label className="text-xs font-bold text-gray-400 uppercase mb-1">
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border p-2 rounded text-sm bg-white"
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

      {/* MEMBERS TABLE */}
      {filteredMemberships.length === 0 ? (
        <div className="text-center text-gray-500 text-sm">
          No memberships found for this group.
        </div>
      ) : (
        <div className="ms-bg-card p-4 rounded border ms-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Member Name</th>
                <th className="py-2">Mobile</th>
                <th className="py-2">Token</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.map(membership => {

                const member = members.find(
                  mem => mem.memberId === membership.memberId
                );

                if (!member) return null;

                return (
                  <tr key={membership.groupMembershipId} className="border-b">
                    <td className="py-2">{member.name}</td>
                    <td className="py-2">{member.mobile}</td>
                    <td className="py-2">{membership.tokenNo}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleCollect(member.memberId)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default Collections;
