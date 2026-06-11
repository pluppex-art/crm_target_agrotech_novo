import { Task } from '../services/taskService';

export function generateGoogleCalendarUrl(task: Task): string {
  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
  
  const title = encodeURIComponent(task.title);
  
  let description = task.description || '';
  if (task.lead_name) {
    description += `\n\nLead: ${task.lead_name}`;
  }
  if (task.category) {
    description += `\nCategoria: ${task.category}`;
  }
  const encodedDescription = encodeURIComponent(description);

  // Format date: YYYYMMDDTHHMMSSZ
  // For tasks, we usually have a date and maybe a time
  let startDate = '';
  let endDate = '';

  if (task.due_date) {
    const date = task.due_date.replace(/-/g, '');
    if (task.scheduled_time) {
      const time = task.scheduled_time.replace(/:/g, '');
      startDate = `${date}T${time}00`;
      // Assume 1 hour duration
      const [h = 0, m = 0] = task.scheduled_time.split(':').map(Number);
      const endH = (h + 1).toString().padStart(2, '0');
      endDate = `${date}T${endH}${m.toString().padStart(2, '0')}00`;
    } else {
      startDate = date;
      endDate = date;
    }
  }

  const dates = `${startDate}/${endDate}`;
  
  return `${baseUrl}&text=${title}&details=${encodedDescription}&dates=${dates}`;
}
