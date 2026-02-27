import { useEffect, useState } from "react";

const imageOne = "src/assets/icons/checkf.svg";
const imageTwo = "src/assets/icons/checkt.svg";



  // const toggleImage = () => {
  //   setIsClicked(!isClicked); // Flips true to false, or false to true
  // };

export default function HomeScreen() {
  // const [isClicked, setIsClicked] = useState({});
  // const toggleImage = (i) => {
  //   setIsClicked(a => ({
  //     ...a,
  //     [i]: !a[i]
  //   }));
  // };

  const toggleTaskStatus = async (task) => {
  const newStatus = task.Status === "Done" ? "Incomplete" : "Done";

  try {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Status: newStatus }),
    });

    if (!response.ok) throw new Error("Failed to update task");

    setTasks(a =>
      a.map(t =>
        t.id === task.id ? { ...t, Status: newStatus } : t
      )
    );
  } catch (err) {
    console.error(err);
  }
};

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/tasks");
        if (!response.ok) throw new Error("Failed to fetch tasks");

        const data = await response.json();

        setTasks(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  return (
    <div className="subpage">
      <h1 className="lefttitle">Tasks</h1>
      {loading && <p>Loading tasks...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {tasks.map((task) => (
          <div className="task" key={task.id}>
            <div className="taskinfo">
              <div className="tasktitle">
              <span>{task.Name}</span>
              <span className="priority-pill low">Low</span>
              </div> 
              <span className="priority-pill high">tag</span>
            </div>
          
            <button className="image-button" onClick={() => toggleTaskStatus(task)}>
              <img 
                src={task.Status === "Done" ? imageTwo : imageOne}
              />
            </button>

          </div>
        ))}
      {/* <section className="all-tasks">
        <h2>Tasks</h2>
        {/* {data.tasks.filter((t) => !t.pinned)} */}
      {/* </section> */}
    </div>
  );
}