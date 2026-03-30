import { requestNotificationPermission } from '@/lib/pushNotiService';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabaseClient';

export default function NotiReqSwitchButton() {
  const [notiStatus, setNotiStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotiStatus() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('push_noti')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // ✅ sync DB + browser permission
      const isGranted = Notification.permission === 'granted';
      setNotiStatus(data.push_noti && isGranted);

      setLoading(false);
    }

    fetchNotiStatus();
  }, []);

  async function toggleNotiReq() {
    if (loading) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const newStatus = !notiStatus;

    // handle enabling
    if (newStatus) {
      const success = await requestNotificationPermission();

      if (!success) {
        toast.error('Failed to enable notifications');
        setLoading(false);
        return;
      }

      await fetch('/api/push-noti', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Notifications Enabled 🎉',
          body: 'You will now receive updates',
        }),
      });

      
      const { error } = await supabase
        .from('profiles')
        .update({ push_noti: newStatus })
        .eq('id', user.id);

      if (error) {
        console.error(error);
        toast.error('Failed to update setting');
        setLoading(false);
        return;
    }

    }

    setNotiStatus(newStatus);
    setLoading(false);
  }

  return (
    <button
      className="w-12 h-5 relative disabled:opacity-50"
      onClick={toggleNotiReq}
      disabled={loading}
    >
      {/* Background */}
      <div
        className={`w-12 h-5 left-0 top-0 absolute rounded-[50px] transition-colors ${
          notiStatus ? 'bg-[#70E340]' : 'bg-[#CAC7C9]'
        }`}
      />
      {/* Knob */}
      <div
        className={`w-6 h-4 top-[2px] absolute bg-white rounded-[50px] transition-all ${
          notiStatus ? 'left-[22px]' : 'left-[2px]'
        }`}
      />
    </button>
  );
}