from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, case
from datetime import datetime, timezone
from typing import List, Optional
from backend.database import get_db
from backend.models import Task, User
from backend.schemas import TaskCreate, TaskUpdate, TaskResponse, DashboardStats
from backend.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/stats/summary", response_model=DashboardStats)
def get_task_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compute dashboard statistics for the authenticated user:
    total, pending, in_progress, completed, overdue, and completion rate.
    """
    now = datetime.now(timezone.utc)
    user_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()

    total = len(user_tasks)
    pending = sum(1 for t in user_tasks if t.status == "pending")
    in_progress = sum(1 for t in user_tasks if t.status == "in_progress")
    completed = sum(1 for t in user_tasks if t.status == "completed")
    
    overdue = 0
    for t in user_tasks:
        if t.status != "completed" and t.due_date:
            # Handle tz-aware vs tz-naive comparisons safely
            due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if due < now:
                overdue += 1

    completion_rate = round((completed / total * 100), 1) if total > 0 else 0.0

    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "overdue": overdue,
        "completion_rate": completion_rate
    }


@router.get("", response_model=List[TaskResponse])
def get_tasks(
    search: Optional[str] = Query(None, description="Search term for title or description"),
    status: Optional[str] = Query(None, description="Filter by status (pending, in_progress, completed)"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high)"),
    sort_by: Optional[str] = Query("created_at", description="Sort field (created_at, due_date, priority, title)"),
    sort_order: Optional[str] = Query("desc", description="Sort direction (asc, desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all tasks belonging to the current user, with search, filtering, and sorting.
    """
    query = db.query(Task).filter(Task.user_id == current_user.id)

    # Search filter (case-insensitive title or description)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Task.title.ilike(search_pattern),
                Task.description.ilike(search_pattern)
            )
        )

    # Status filter
    if status and status != "all":
        query = query.filter(Task.status == status)

    # Priority filter
    if priority and priority != "all":
        query = query.filter(Task.priority == priority)

    # Sorting
    is_desc = sort_order.lower() == "desc"

    if sort_by == "priority":
        # Custom priority ordering: high > medium > low
        priority_weight = case(
            (Task.priority == "high", 3),
            (Task.priority == "medium", 2),
            (Task.priority == "low", 1),
            else_=0
        )
        query = query.order_by(desc(priority_weight) if is_desc else asc(priority_weight))
    elif sort_by == "due_date":
        if is_desc:
            query = query.order_by(Task.due_date.desc().nullslast())
        else:
            query = query.order_by(Task.due_date.asc().nullslast())
    elif sort_by == "title":
        query = query.order_by(Task.title.desc() if is_desc else Task.title.asc())
    else:  # default created_at
        query = query.order_by(Task.created_at.desc() if is_desc else Task.created_at.asc())

    return query.all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task assigned to the current authenticated user.
    """
    new_task = Task(
        title=task_in.title.strip(),
        description=task_in.description.strip() if task_in.description else None,
        status=task_in.status.value,
        priority=task_in.priority.value,
        due_date=task_in.due_date,
        user_id=current_user.id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single task by ID. Ensures user can only view their own tasks.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing task. Ensures user can only modify their own tasks.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value is not None:
            setattr(task, field, value.value if hasattr(value, "value") else str(value))
        elif field == "priority" and value is not None:
            setattr(task, field, value.value if hasattr(value, "value") else str(value))
        elif field == "title" and value is not None:
            setattr(task, field, value.strip())
        elif field == "description" and value is not None:
            setattr(task, field, value.strip())
        else:
            setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/complete", response_model=TaskResponse)
def toggle_task_complete(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Quickly toggle the completion status of a task between completed and pending.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    task.status = "pending" if task.status == "completed" else "completed"
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task. Ensures user can only delete their own tasks.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    db.delete(task)
    db.commit()
    return None
