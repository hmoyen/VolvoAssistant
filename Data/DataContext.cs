using Microsoft.EntityFrameworkCore;
using VolvoAssistant.Models;

namespace VolvoAssistant.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                optionsBuilder.UseNpgsql("Host=ep-steep-rice-acw12mrw-pooler.sa-east-1.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_3tse7OaQRWhw");
            }
        }
    }
}
