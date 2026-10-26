"""Create four separate research-style feedback charts from the uploaded CSV.

Dependencies: pandas, matplotlib
Run: python feedback_charts_separate.py
Edit CSV_PATH below if the CSV is stored elsewhere.
"""
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

# Change this path if needed. The CSV must contain the feedback column names below.
CSV_PATH = Path(__file__).resolve().parent / "data" / "web_feedback.csv"
OUTPUT_DIR = Path("separate_feedback_charts")

# Requested research theme
PALE_BLUE = "#B5D6F7"
BLUE = "#1764AE"
PALE_ORANGE = "#FFD080"
ORANGE = "#BC7410"
TEXT = "#222222"
GRID = "#E9E9E9"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "text.color": TEXT,
    "axes.labelcolor": TEXT,
    "xtick.color": TEXT,
    "ytick.color": TEXT,
    "axes.edgecolor": "#777777",
    "axes.titleweight": "bold",
    "svg.fonttype": "none",
})


def style_axis(ax, grid_axis="y"):
    """Apply the same clean white, light-grid chart styling."""
    ax.set_facecolor("white")
    ax.set_axisbelow(True)
    ax.grid(axis=grid_axis, color=GRID, linewidth=0.7)
    ax.tick_params(axis="both", labelsize=10)
    ax.xaxis.label.set_size(11)
    ax.yaxis.label.set_size(11)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color("#777777")
        ax.spines[side].set_linewidth(0.7)


def save_chart(fig, name):
    """Save one chart as a 300 dpi PNG and as a vector SVG."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    png_path = OUTPUT_DIR / f"{name}.png"
    svg_path = OUTPUT_DIR / f"{name}.svg"
    fig.savefig(png_path, dpi=300, bbox_inches="tight", facecolor="white")
    fig.savefig(svg_path, format="svg", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print(f"Saved: {png_path} and {svg_path}")


def plot_average_scores(df):
    """Graph 1: mean score for each feedback area."""
    rating_columns = {
        "Hairstyle": "hairstyle_rating",
        "Hair color": "hair_color_rating",
        "Face similarity": "face_similarity_rating",
        "Waiting satisfaction": "waiting_satisfaction_rating",
        "Overall satisfaction": "overall_satisfaction_rating",
        "Website satisfaction": "website_satisfaction_rating",
    }
    labels = list(rating_columns)
    values = [df[column].mean() for column in rating_columns.values()]
    colors = [BLUE, PALE_BLUE, ORANGE, PALE_ORANGE, BLUE, ORANGE]

    fig, ax = plt.subplots(figsize=(9, 5.5), facecolor="white")
    y = range(len(labels))
    ax.barh(y, values, color=colors, height=0.62)
    ax.set_yticks(list(y), labels)
    ax.invert_yaxis()
    ax.set_xlim(0, 5.35)
    ax.set_xticks([0, 1, 2, 3, 4, 5])
    ax.set_xlabel("Mean rating (out of 5)")
    ax.set_title("Average score by evaluation area", loc="left", fontsize=15, pad=12)
    style_axis(ax, grid_axis="x")
    for index, value in enumerate(values):
        ax.text(value + 0.06, index, f"{value:.2f}", va="center",
                fontsize=10, weight="bold", color=TEXT)
    save_chart(fig, "01_average_scores")


def plot_overall_satisfaction(df):
    """Graph 2: count and percentage for each overall satisfaction rating."""
    scores = df["overall_satisfaction_rating"].dropna()
    counts = scores.value_counts().reindex([1, 2, 3, 4, 5], fill_value=0)
    colors = [PALE_BLUE, BLUE, PALE_ORANGE, ORANGE, BLUE]

    fig, ax = plt.subplots(figsize=(8, 5.5), facecolor="white")
    bars = ax.bar(counts.index.astype(str), counts.values, color=colors, width=0.66)
    ax.set_title("Overall satisfaction distribution", loc="left", fontsize=15, pad=12)
    ax.set_xlabel("Rating")
    ax.set_ylabel("Responses")
    ax.set_ylim(0, max(counts.values) * 1.22)
    style_axis(ax, grid_axis="y")
    for bar, value in zip(bars, counts.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
                f"{value}  ({value / len(scores):.0%})", ha="center",
                fontsize=9.5, weight="bold", color=TEXT)
    save_chart(fig, "02_overall_satisfaction")


def plot_wait_time(df):
    """Graph 3: wait-time histogram with mean and median reference lines."""
    wait = df["user_wait_seconds"].dropna()
    fig, ax = plt.subplots(figsize=(8, 5.5), facecolor="white")
    ax.hist(wait, bins=[10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65],
            color=BLUE, edgecolor="white", linewidth=1.2)
    ax.axvline(wait.mean(), color=ORANGE, linestyle="--", linewidth=1.8,
               label=f"Mean {wait.mean():.1f}s")
    ax.axvline(wait.median(), color=PALE_BLUE, linestyle=":", linewidth=2.2,
               label=f"Median {wait.median():.1f}s")
    ax.set_title("User wait time", loc="left", fontsize=15, pad=12)
    ax.set_xlabel("Seconds")
    ax.set_ylabel("Responses")
    ax.legend(frameon=False, loc="upper right")
    style_axis(ax, grid_axis="y")
    ax.text(0.02, 0.91,
            f"Range {wait.min():.1f}–{wait.max():.1f}s  •  "
            f"{wait.le(25).mean():.0%} finished within 25s",
            transform=ax.transAxes, fontsize=9.5, color=TEXT, va="top")
    save_chart(fig, "03_wait_time")


def plot_age_groups(df):
    """Graph 4: participant counts by age group."""
    age = df["age_group"].fillna("Not provided").value_counts()
    order = [group for group in ["ต่ำกว่า 18 ปี", "18–24 ปี", "25–34 ปี",
                                  "35 ปีขึ้นไป", "Not provided"] if group in age.index]
    age = age.reindex(order)
    display_labels = {
        "ต่ำกว่า 18 ปี": "Under 18",
        "18–24 ปี": "18–24",
        "25–34 ปี": "25–34",
        "35 ปีขึ้นไป": "35+",
        "Not provided": "Not provided",
    }
    colors = [PALE_ORANGE, BLUE, ORANGE, PALE_BLUE, BLUE][:len(age)]

    fig, ax = plt.subplots(figsize=(8, 5.5), facecolor="white")
    bars = ax.bar([display_labels[group] for group in age.index], age.values,
                  color=colors, width=0.66)
    ax.set_title("Participant age groups", loc="left", fontsize=15, pad=12)
    ax.set_ylabel("Responses")
    ax.set_ylim(0, max(age.values) * 1.25)
    style_axis(ax, grid_axis="y")
    for bar, value in zip(bars, age.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
                f"{value}  ({value / len(df):.0%})", ha="center",
                fontsize=9.5, weight="bold", color=TEXT)
    save_chart(fig, "04_age_groups")


def main():
    if not CSV_PATH.is_file():
        raise FileNotFoundError(
            f"CSV not found: {CSV_PATH.resolve()}\n"
            "Set CSV_PATH to the full path of Feedback - Feedback (1).csv."
        )
    data = pd.read_csv(CSV_PATH)
    plot_average_scores(data)
    plot_overall_satisfaction(data)
    plot_wait_time(data)
    plot_age_groups(data)


if __name__ == "__main__":
    main()
