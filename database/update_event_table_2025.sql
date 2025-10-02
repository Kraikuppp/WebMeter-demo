-- Update event table for 2025 and add recent sample data
-- This script adds current date sample data for testing Event Logging system

-- Insert recent sample data for testing (September 2025)
INSERT INTO event (timestamp, username, lognet, ip, event) VALUES
-- Today's events
('2025-09-19 08:00:15', 'admin', '10.0.0.1', '192.168.1.100', 'User login successful'),
('2025-09-19 08:05:22', 'admin', '10.0.0.1', '192.168.1.100', 'Event Management Page accessed'),
('2025-09-19 08:10:33', 'admin', '10.0.0.1', '192.168.1.100', 'Search Events performed'),
('2025-09-19 08:15:45', 'admin', '10.0.0.1', '192.168.1.100', 'Data export initiated - PDF'),
('2025-09-19 08:20:12', 'operator1', '10.0.0.2', '192.168.1.101', 'User login successful'),
('2025-09-19 08:25:28', 'operator1', '10.0.0.2', '192.168.1.101', 'Dashboard accessed'),
('2025-09-19 08:30:42', 'operator1', '10.0.0.2', '192.168.1.101', 'Table Data search performed'),
('2025-09-19 08:35:55', 'supervisor', '10.0.0.3', '192.168.1.102', 'User login successful'),
('2025-09-19 08:40:18', 'supervisor', '10.0.0.3', '192.168.1.102', 'Report generated'),
('2025-09-19 08:45:33', 'admin', '10.0.0.1', '192.168.1.100', 'System configuration updated'),
('2025-09-19 09:00:15', 'admin', '10.0.0.1', '192.168.1.100', 'User management accessed'),
('2025-09-19 09:05:42', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter data viewed'),
('2025-09-19 09:10:28', 'operator1', '10.0.0.2', '192.168.1.101', 'Real-time monitoring started'),
('2025-09-19 09:15:55', 'supervisor', '10.0.0.3', '192.168.1.102', 'Email report sent'),
('2025-09-19 09:20:12', 'supervisor', '10.0.0.3', '192.168.1.102', 'LINE notification sent'),
('2025-09-19 09:25:33', 'admin', '10.0.0.1', '192.168.1.100', 'Database backup initiated'),
('2025-09-19 09:30:45', 'admin', '10.0.0.1', '192.168.1.100', 'Security audit completed'),
('2025-09-19 09:35:18', 'operator1', '10.0.0.2', '192.168.1.101', 'Alarm acknowledged'),
('2025-09-19 09:40:28', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter configuration updated'),
('2025-09-19 09:45:42', 'supervisor', '10.0.0.3', '192.168.1.102', 'Performance report exported'),
('2025-09-19 10:00:15', 'admin', '10.0.0.1', '192.168.1.100', 'System health check completed'),
('2025-09-19 10:05:33', 'admin', '10.0.0.1', '192.168.1.100', 'Event logging system activated'),
('2025-09-19 10:10:45', 'operator1', '10.0.0.2', '192.168.1.101', 'Data quality check performed'),
('2025-09-19 10:15:22', 'operator1', '10.0.0.2', '192.168.1.101', 'Chart data exported'),
('2025-09-19 10:20:38', 'supervisor', '10.0.0.3', '192.168.1.102', 'Team meeting scheduled'),
('2025-09-19 10:25:55', 'supervisor', '10.0.0.3', '192.168.1.102', 'Monthly report finalized'),
('2025-09-19 10:30:12', 'admin', '10.0.0.1', '192.168.1.100', 'User permissions updated'),
('2025-09-19 10:35:28', 'admin', '10.0.0.1', '192.168.1.100', 'System logs reviewed'),
('2025-09-19 10:40:45', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter readings validated'),
('2025-09-19 10:45:18', 'operator1', '10.0.0.2', '192.168.1.101', 'Communication test completed'),
('2025-09-19 11:00:33', 'supervisor', '10.0.0.3', '192.168.1.102', 'Compliance check performed'),
('2025-09-19 11:05:55', 'supervisor', '10.0.0.3', '192.168.1.102', 'Audit trail generated'),
('2025-09-19 11:10:22', 'admin', '10.0.0.1', '192.168.1.100', 'Backup verification completed'),
('2025-09-19 11:15:38', 'admin', '10.0.0.1', '192.168.1.100', 'Network connectivity verified'),
('2025-09-19 11:20:45', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter firmware updated'),
('2025-09-19 11:25:12', 'operator1', '10.0.0.2', '192.168.1.101', 'Data synchronization completed'),
('2025-09-19 11:30:28', 'supervisor', '10.0.0.3', '192.168.1.102', 'Resource allocation updated'),
('2025-09-19 11:35:45', 'supervisor', '10.0.0.3', '192.168.1.102', 'Project status reviewed'),
('2025-09-19 11:40:18', 'admin', '10.0.0.1', '192.168.1.100', 'Security policy updated'),
('2025-09-19 11:45:33', 'admin', '10.0.0.1', '192.168.1.100', 'System optimization completed'),
('2025-09-19 12:00:55', 'operator1', '10.0.0.2', '192.168.1.101', 'Lunch break - user logout'),
('2025-09-19 12:05:22', 'supervisor', '10.0.0.3', '192.168.1.102', 'Lunch break - user logout'),
('2025-09-19 13:00:15', 'operator1', '10.0.0.2', '192.168.1.101', 'User login successful'),
('2025-09-19 13:05:42', 'supervisor', '10.0.0.3', '192.168.1.102', 'User login successful'),
('2025-09-19 13:10:28', 'operator1', '10.0.0.2', '192.168.1.101', 'Afternoon monitoring started'),
('2025-09-19 13:15:45', 'supervisor', '10.0.0.3', '192.168.1.102', 'Report review session started'),
('2025-09-19 13:20:18', 'admin', '10.0.0.1', '192.168.1.100', 'System performance monitored'),
('2025-09-19 13:25:33', 'admin', '10.0.0.1', '192.168.1.100', 'Database maintenance completed'),
('2025-09-19 13:30:55', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter status check completed'),
('2025-09-19 13:35:22', 'operator1', '10.0.0.2', '192.168.1.101', 'Data integrity verified'),
('2025-09-19 13:40:38', 'supervisor', '10.0.0.3', '192.168.1.102', 'Team performance evaluated'),
('2025-09-19 13:45:45', 'supervisor', '10.0.0.3', '192.168.1.102', 'Training session scheduled'),
('2025-09-19 14:00:12', 'admin', '10.0.0.1', '192.168.1.100', 'Event logging test completed'),
('2025-09-19 14:05:28', 'admin', '10.0.0.1', '192.168.1.100', 'System status verified'),
('2025-09-19 14:10:45', 'operator1', '10.0.0.2', '192.168.1.101', 'Real-time data export completed'),
('2025-09-19 14:15:18', 'operator1', '10.0.0.2', '192.168.1.101', 'Communication protocol tested'),
('2025-09-19 14:20:33', 'supervisor', '10.0.0.3', '192.168.1.102', 'Weekly report generated'),
('2025-09-19 14:25:55', 'supervisor', '10.0.0.3', '192.168.1.102', 'Quality assurance check completed'),
('2025-09-19 14:30:22', 'admin', '10.0.0.1', '192.168.1.100', 'Access control updated'),
('2025-09-19 14:35:38', 'admin', '10.0.0.1', '192.168.1.100', 'Log retention policy updated'),
('2025-09-19 14:40:45', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter calibration verified'),
('2025-09-19 14:45:12', 'operator1', '10.0.0.2', '192.168.1.101', 'Data validation completed'),
('2025-09-19 14:50:28', 'supervisor', '10.0.0.3', '192.168.1.102', 'End-of-day preparation started'),
('2025-09-19 14:55:45', 'supervisor', '10.0.0.3', '192.168.1.102', 'Daily summary generated'),

-- Yesterday's events (for testing date range)
('2025-09-18 08:00:15', 'admin', '10.0.0.1', '192.168.1.100', 'User login successful'),
('2025-09-18 08:30:22', 'admin', '10.0.0.1', '192.168.1.100', 'System startup completed'),
('2025-09-18 09:00:33', 'operator1', '10.0.0.2', '192.168.1.101', 'User login successful'),
('2025-09-18 09:30:45', 'supervisor', '10.0.0.3', '192.168.1.102', 'User login successful'),
('2025-09-18 10:00:18', 'admin', '10.0.0.1', '192.168.1.100', 'Database backup completed'),
('2025-09-18 10:30:28', 'operator1', '10.0.0.2', '192.168.1.101', 'Meter data collected'),
('2025-09-18 11:00:42', 'supervisor', '10.0.0.3', '192.168.1.102', 'Report generated'),
('2025-09-18 11:30:55', 'admin', '10.0.0.1', '192.168.1.100', 'System maintenance completed'),
('2025-09-18 12:00:12', 'operator1', '10.0.0.2', '192.168.1.101', 'Lunch break - user logout'),
('2025-09-18 13:00:25', 'operator1', '10.0.0.2', '192.168.1.101', 'User login successful'),
('2025-09-18 14:00:38', 'supervisor', '10.0.0.3', '192.168.1.102', 'Performance review completed'),
('2025-09-18 15:00:45', 'admin', '10.0.0.1', '192.168.1.100', 'Security audit completed'),
('2025-09-18 16:00:22', 'operator1', '10.0.0.2', '192.168.1.101', 'Data export completed'),
('2025-09-18 17:00:33', 'supervisor', '10.0.0.3', '192.168.1.102', 'End-of-day report generated'),
('2025-09-18 18:00:45', 'admin', '10.0.0.1', '192.168.1.100', 'System shutdown initiated'),

-- Tomorrow's events (for testing future dates)
('2025-09-20 08:00:15', 'system', '10.0.0.1', '192.168.1.100', 'Scheduled maintenance task'),
('2025-09-20 09:00:22', 'system', '10.0.0.1', '192.168.1.100', 'Database optimization scheduled'),
('2025-09-20 10:00:33', 'system', '10.0.0.1', '192.168.1.100', 'Backup verification scheduled');

-- Verify the data was inserted
SELECT COUNT(*) as total_events FROM event;
SELECT COUNT(*) as today_events FROM event WHERE DATE(timestamp) = '2025-09-19';
SELECT COUNT(*) as yesterday_events FROM event WHERE DATE(timestamp) = '2025-09-18';

-- Show recent events
SELECT 
    id,
    timestamp,
    username,
    ip,
    lognet,
    event
FROM event 
WHERE timestamp >= '2025-09-18 00:00:00'
ORDER BY timestamp DESC
LIMIT 10;
